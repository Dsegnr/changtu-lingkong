"""Migrated history first; engine-free offline review and saved-plan persistence."""
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time
import uuid
from offline_workflow_v1 import JobStore, WorkflowError, encoded

KIND='native_signal_pair'
SCENE='20250120_video'

class PortableWorkflowStore(JobStore):
    def __init__(self,directory,resolver,*,max_jobs=8,wall_seconds=45,max_bytes=32*1024*1024):
        # A migrated database is required. Never create a fresh native allowance.
        self.directory=Path(directory).resolve(strict=True);self.db=self.directory/'workflow.sqlite3'
        if not self.db.is_file():raise WorkflowError('migrated_history_required')
        self.max_jobs,self.wall_seconds,self.max_bytes=max_jobs,wall_seconds,max_bytes
        self.resolver=resolver
        with self.connect()as db:
            tables={r[0]for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            if not {'jobs','events','plans','native_campaign','native_launches'}<=tables:raise WorkflowError('migrated_history_required')
            if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise WorkflowError('stored_history_changed')
            c=db.execute('SELECT * FROM native_campaign WHERE id=1').fetchone()
            launches=db.execute('SELECT ordinal,arm,job FROM native_launches ORDER BY ordinal').fetchall()
            if c is None or c['closed']!=1 or [(r['ordinal'],r['arm'])for r in launches]!=[(1,'q'),(2,'joint')]or any(r['job']!=c['job']for r in launches):
                raise WorkflowError('registered_closed_history_required')

    def create(self,payload,key):
        if type(payload)is not dict:raise WorkflowError('invalid_job_request',400)
        if payload.get('kind')!=KIND:return super().create(payload,key)
        if set(payload)!={'kind','scenario'}or payload['scenario']!=SCENE or not isinstance(key,str)or not re.fullmatch(r'[A-Za-z0-9_-]{8,80}',key):
            raise WorkflowError('invalid_job_request',400)
        with self.connect()as db:
            db.execute('BEGIN IMMEDIATE')
            old=db.execute('SELECT * FROM jobs WHERE key=?',(key,)).fetchone()
            if old:
                if old['payload']!=encoded(payload):raise WorkflowError('idempotency_conflict')
                return self._job(db,old),False
            raise WorkflowError('native_campaign_already_registered')

    def reserve(self,identity,arm,attempt):
        # This migrated instance's registered campaign is closed, no spec/engine load.
        with self.connect()as db:
            c=db.execute('SELECT * FROM native_campaign WHERE id=1').fetchone()
            if c is None or c['closed']or db.execute('SELECT count(*) FROM native_launches').fetchone()[0]>=2:
                raise WorkflowError('native_launch_budget_closed')
        raise WorkflowError('registered_closed_history_required')

    def campaign_status(self):
        with self.connect()as db:
            row=db.execute('SELECT * FROM native_campaign WHERE id=1').fetchone()
            return {'scene':SCENE,'maximum':2,'used':db.execute('SELECT count(*) FROM native_launches').fetchone()[0],
                    'job_id':row['job'],'closed':bool(row['closed']),'reason':row['reason']}

    def execute_one(self,catalog):
        with self.connect()as db:
            row=db.execute("SELECT payload FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
            if row and json.loads(row['payload'])['kind']!='existing_native_pair_review':raise WorkflowError('native_launch_budget_closed')
        return super().execute_one(catalog)

    def save_plan(self,identity,name,arm):
        if not isinstance(name,str)or not name.strip()or len(name.strip())>60 or any(ord(c)<32 for c in name)or arm not in('q','joint'):
            raise WorkflowError('invalid_plan',400)
        job=self.get(identity)
        if job['status']!='completed':raise WorkflowError('job_not_completed')
        with self.connect()as db:
            row=db.execute('SELECT * FROM plans WHERE job=?',(identity,)).fetchone()
            if row:
                plan=self._plan(row);d=plan['document']
                if d['job_id']!=identity or d['result_sha256']!=job['result_sha']:raise WorkflowError('stored_plan_changed')
                if d['name']!=name.strip()or d['policy']!=arm:raise WorkflowError('plan_already_saved')
                return plan
        r=job['result'];self.resolver.verify(r['input_locks'])
        native=job['kind']==KIND
        document={'schema':'native_plan_draft_v1'if native else'offline_plan_draft_v1','name':name.strip(),'job_id':identity,
                  'result_sha256':job['result_sha'],'scenario':r['scenario'],'campus':'SS','network_sha256':r['network_sha256'],
                  'policy':arm,'run_id':r['run_ids'][arm],'metrics':r['metrics'][arm],'pair_delta':r['delta'],'harmed':r['harmed'],
                  'evidence_locks':r['input_locks'],'scope':'offline_simulation_draft'if native else'offline_review_draft',
                  'production_admitted':False,'device_commands_emitted':0,'new_simulation_launches':2 if native else 0,'limitations':r['limitations']}
        if native:document['development_checks']=r['development_checks']
        body=encoded(document)
        with self.connect()as db:
            db.execute('BEGIN IMMEDIATE')
            current=db.execute('SELECT result_sha FROM jobs WHERE id=?',(identity,)).fetchone()
            if current is None or current['result_sha']!=job['result_sha']:raise WorkflowError('stored_result_changed')
            old=db.execute('SELECT * FROM plans WHERE job=?',(identity,)).fetchone()
            if old:
                if old['document']!=body:raise WorkflowError('plan_already_saved')
                return self._plan(old)
            self.size_guard();pid=uuid.uuid4().hex
            db.execute('INSERT INTO plans VALUES(?,?,?,?,?)',(pid,identity,time.time(),body,hashlib.sha256(body.encode()).hexdigest()))
            return self._plan(db.execute('SELECT * FROM plans WHERE id=?',(pid,)).fetchone())
