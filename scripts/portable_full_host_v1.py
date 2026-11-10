"""Standalone loopback workbench with relative assets and writable offline tasks."""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import json
from pathlib import Path
import re
import secrets
import sqlite3
from urllib.parse import urlsplit
from offline_workflow_v1 import WorkflowError,OwnerLock,Worker,DATES
from portable_workflow_store_v1 import PortableWorkflowStore
from portable_evidence_resolver_v1 import EvidenceResolver
from relocatable_review_catalog_v1 import RelocatableNativeCatalog
from portable_asset_registry_v1 import contained_file,valid_sha

CSP="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"

def choose_encoding(header,has_gzip):
    values={}
    for part in header.split(','):
        fields=part.strip().split(';');kind=fields[0].lower();quality=1.
        try:
            for f in fields[1:]:
                if f.strip().startswith('q='):quality=float(f.strip()[2:])
        except ValueError:quality=0.
        values[kind]=quality if 0<=quality<=1 else 0.
    z=values.get('gzip',values.get('*',0));raw=values.get('identity',0 if values.get('*')==0 else 1)
    if has_gzip and z>0 and z>=raw:return 'gzip'
    if raw>0:return 'raw'
    if has_gzip and z>0:return 'gzip'
    raise WorkflowError('encoding_not_acceptable',406)

def handler_class(root,config,store,token,port):
    host=f'127.0.0.1:{port}';origin='http://'+host
    class Handler(BaseHTTPRequestHandler):
        def setup(self):super().setup();self.connection.settimeout(8)
        def send_body(self,status,body,mime,coding=None):
            self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)))
            self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Security-Policy',CSP)
            self.send_header('Vary','Accept-Encoding')
            if coding=='gzip':self.send_header('Content-Encoding','gzip')
            self.end_headers()
            try:self.wfile.write(body)
            except(OSError,ConnectionError):pass
        def respond(self,status,value):return self.send_body(status,json.dumps(value,ensure_ascii=False,allow_nan=False).encode('utf8'),'application/json; charset=utf-8')
        def allowed(self,mutation=False):
            if self.headers.get('Host')!=host or self.headers.get('Origin',origin)!=origin or self.headers.get('Sec-Fetch-Site')=='cross-site':raise WorkflowError('origin_not_allowed',403)
            if mutation and not secrets.compare_digest(self.headers.get('X-Workflow-Token',''),token):raise WorkflowError('session_required',403)
        def route(self):
            parsed=urlsplit(self.path);path=parsed.path
            if '%'in path or '\\'in path or '//'in path or any(x in('.','..')for x in path.split('/')):raise WorkflowError('route_not_found',404)
            if parsed.query and (path not in config['spa_routes'] or not re.fullmatch(r'task=[a-f0-9]{32}|mode=legacy',parsed.query)):raise WorkflowError('route_not_found',404)
            return path
        def do_GET(self):
            try:
                self.allowed();path=self.route()
                if path=='/health':return self.respond(200,{'service':'portable_changtu_workbench','pid':__import__('os').getpid(),'roadside_connected':False,'native_engine_configured':False,'workflow_writable':True})
                if path=='/api/workflow/session':
                    campaign=store.campaign_status()
                    return self.respond(200,{'token':token,'schema':'offline_workflow_v2','artifact_jobs':config['artifact_jobs'],'preview_readonly':False,'task_kind':'existing_native_pair_review','max_jobs':store.max_jobs,'wall_seconds':store.wall_seconds,'max_bytes':store.max_bytes,'single_concurrency':True,'automatic_retry':False,'new_simulation_launches':campaign['used'],'native_simulation_executor_available':False,'native':{**campaign,'accepting':False,'wall_s_per_arm':120,'audit_wall_s_per_arm':90},'scenarios':[{'id':d,'campus':'SS','cars':23,'label':d[:4]+'-'+d[4:6]+'-'+d[6:8]}for d in DATES]})
                if path=='/api/workflow/jobs':return self.respond(200,{'jobs':store.listing()})
                if path=='/api/workflow/plans':return self.respond(200,{'plans':store.plans()})
                if re.fullmatch('/api/workflow/jobs/[a-f0-9]{32}',path):return self.respond(200,store.get(path.rsplit('/',1)[1]))
                if path.startswith('/api/native-artifacts/'):
                    identity=path.split('/')[3]
                    if identity not in config['artifact_jobs']:raise WorkflowError('artifact_not_found',404)
                    job=store.get(identity)
                    if job['status']!='completed'or job['kind']!='native_signal_pair':raise WorkflowError('artifact_job_not_ready')
                row=config['routes'].get('/index.html'if path in config['spa_routes']else path)
                if row is None:raise WorkflowError('route_not_found',404)
                coding=choose_encoding(self.headers.get('Accept-Encoding',''),bool(row['gzip']));item=row[coding]
                p=contained_file(root,item['relative_path']);body=p.read_bytes()
                if len(body)!=item['bytes']or hashlib.sha256(body).hexdigest()!=item['sha256']:raise WorkflowError('asset_changed',503)
                return self.send_body(200,body,row['mime'],coding)
            except WorkflowError as e:return self.respond(e.status,{'error':e.code})
            except(OSError,ValueError,KeyError,sqlite3.Error):return self.respond(503,{'error':'evidence_unavailable'})
        def do_POST(self):
            try:
                self.allowed(True);path=self.route()
                if self.headers.get('Transfer-Encoding'):raise WorkflowError('body_not_allowed',400)
                if self.headers.get('Content-Type','').split(';')[0]!='application/json':raise WorkflowError('json_required',415)
                try:size=int(self.headers.get('Content-Length','-1'))
                except ValueError:raise WorkflowError('invalid_body_size',400)
                if not 0<=size<=4096:raise WorkflowError('invalid_body_size',413)
                raw=self.rfile.read(size)
                if len(raw)!=size:raise WorkflowError('incomplete_body',400)
                value=json.loads(raw)
                if type(value)is not dict:raise WorkflowError('invalid_body',400)
                if path=='/api/workflow/jobs':
                    job,created=store.create(value,self.headers.get('Idempotency-Key'));return self.respond(201 if created else 200,job)
                if re.fullmatch('/api/workflow/jobs/[a-f0-9]{32}/plan',path):
                    if set(value)!={'name','policy'}:raise WorkflowError('invalid_plan',400)
                    return self.respond(200,store.save_plan(path.split('/')[4],value['name'],value['policy']))
                raise WorkflowError('route_not_found',404)
            except WorkflowError as e:return self.respond(e.status,{'error':e.code})
            except(UnicodeError,json.JSONDecodeError):return self.respond(400,{'error':'invalid_json'})
            except(OSError,ValueError,KeyError,TypeError,sqlite3.Error):return self.respond(503,{'error':'evidence_unavailable'})
        def forbidden(self):return self.respond(405,{'error':'method_not_allowed'})
        do_PUT=do_DELETE=do_PATCH=forbidden
    return Handler

def main():
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8824);p.add_argument('--config-sha',required=True);a=p.parse_args()
    root=Path(__file__).resolve().parents[1];body=(root/'deployment.json').read_bytes()
    if hashlib.sha256(body).hexdigest()!=valid_sha(a.config_sha):raise ValueError('deployment configuration hash differs')
    config=json.loads(body);assert config['schema']=='portable_full_host_v1'
    resolver=EvidenceResolver(root,config['source_root_label'],config['registry'])
    runtime=(root/config['runtime_relative']).resolve(strict=True);runtime.relative_to(root)
    owner=OwnerLock(runtime)
    try:
        store=PortableWorkflowStore(runtime,resolver)
        server=ThreadingHTTPServer(('127.0.0.1',a.port),handler_class(root,config,store,secrets.token_urlsafe(32),a.port))
        store.recover();worker=Worker(store,RelocatableNativeCatalog(root,config['source_root_label']));worker.start()
        try:server.serve_forever()
        finally:worker.stop.set();worker.thread.join(timeout=47);server.server_close()
    finally:owner.close()

if __name__=='__main__':main()
