"""Persistent bounded review jobs. No simulation, model, speed or device API."""
from contextlib import contextmanager
from decimal import Decimal as D
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import threading
import time
import uuid
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATES = ('20250525_video', '20250526_video')
NATIVE_SEAL = 'd10e22dc546b671e383e6e08a67f00d7fd5cafa6147f89e76b3cc1cec8fda409'
PRODUCT_SEAL = '27247859b7cdcc12153e22136df1eb7a8c9ea8291ff17fae3f35206814ea512f'
NETWORK = 'ab728b65d9d7238df7d5318181af3343d64e7a8ba5c411be396de17d5af2eca3'
TERMINAL = ('completed', 'failed', 'interrupted')

def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)

def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

class WorkflowError(Exception):
    def __init__(self, code, status=409):
        super().__init__(code)
        self.code, self.status = code, status

class NativeCatalog:
    """Only fixed, already sealed files; HTTP never supplies a path or program."""
    def __init__(self, root=ROOT):
        self.root = Path(root)
        self.raw = self.root / 'outputs/fluid_crossdate_native_20261029_01'
        self.product = self.root / 'outputs/fluid_joint_product_20261029_01'
        self.data = self.root / 'data/fluid_crossdate_demand_20261029_01'

    def files(self, date):
        if date not in DATES:
            raise WorkflowError('invalid_scenario', 400)
        if digest(self.raw / 'MANIFEST.json') != NATIVE_SEAL or digest(self.product / 'MANIFEST.json') != PRODUCT_SEAL:
            raise WorkflowError('source_changed')
        native = json.loads((self.raw / 'MANIFEST.json').read_text('utf8'))
        product = json.loads((self.product / 'MANIFEST.json').read_text('utf8'))
        external = json.loads((self.product / 'input_locks.json').read_text('utf8'))
        if digest(self.product / 'input_locks.json') != product['input_locks.json']:
            raise WorkflowError('source_changed')
        paths = {str(self.raw / 'MANIFEST.json'): NATIVE_SEAL, str(self.product / 'MANIFEST.json'): PRODUCT_SEAL}
        for suffix in ('_mapping.json', '.rou.xml'):
            file = self.data / (date + suffix)
            paths[str(file)] = external[str(file)]
        for arm in ('q', 'joint'):
            for name in ('tripinfo.xml', 'fcd.xml', 'independent_audit.json'):
                rel = f'{date}/{arm}/{name}'
                paths[str(self.raw / rel)] = native[rel]
        for name in (date + '_common.json', date + '_analysis.json'):
            paths[str(self.product / name)] = product[name]
        for name in ('network.net.xml', 'contract.json'):
            file = self.root / 'data/connected_campus_network_four_20261023_02' / name
            paths[str(file)] = external[str(file)]
        return paths

    def review(self, date, progress, guard):
        locks = self.files(date)
        def verify():
            for name, expected in locks.items():
                guard()
                if digest(name) != expected:
                    raise WorkflowError('source_changed')
        verify()
        progress('inputs_verified', {'files': len(locks)})
        mapping = json.loads((self.data / (date + '_mapping.json')).read_text('utf8'))
        schedule = {v.get('id'): D(v.get('depart')) for v in ET.parse(self.data / (date + '.rou.xml')).getroot().findall('vehicle')}
        if len(schedule) != 23 or set(schedule) != {v['id'] for v in mapping}:
            raise WorkflowError('identity_mismatch')
        common = json.loads((self.product / (date + '_common.json')).read_text('utf8'))
        if common['network_sha256'] != NETWORK or common['scenario'] != date:
            raise WorkflowError('domain_mismatch')
        ledger, metrics, frames = {}, {}, {}
        for arm in ('q', 'joint'):
            folder = self.raw / date / arm
            if not json.loads((folder / 'independent_audit.json').read_text('utf8'))['passed']:
                raise WorkflowError('unverified_native_execution')
            trips = {v.get('id'): v for v in ET.parse(folder / 'tripinfo.xml').getroot().findall('tripinfo')}
            if set(trips) != set(schedule):
                raise WorkflowError('identity_mismatch')
            stops, peaks = {}, dict.fromkeys(schedule, D(0))
            count = 0
            for _, step in ET.iterparse(folder / 'fcd.xml', events=['end']):
                if step.tag != 'timestep':
                    continue
                guard()
                t = D(step.get('time'))
                if t != D(count) / 5:
                    raise WorkflowError('native_clock_gap')
                present = set()
                for v in step.findall('vehicle'):
                    identity = v.get('id')
                    if identity not in schedule:
                        raise WorkflowError('identity_mismatch')
                    present.add(identity)
                    if D(v.get('speed')) < D('.1'):
                        stops.setdefault(identity, t)
                        peaks[identity] = max(peaks[identity], t - stops[identity])
                    else:
                        stops.pop(identity, None)
                for identity in set(stops) - present:
                    stops.pop(identity)
                count += 1
                step.clear()
            rows = []
            for identity, x in trips.items():
                guard()
                arrive, depart, duration = (D(x.get(key)) for key in ('arrival', 'depart', 'duration'))
                if arrive < 0 or arrive - depart != duration or depart < schedule[identity]:
                    raise WorkflowError('trip_accounting_invalid')
                cost, entry = arrive - schedule[identity], depart - schedule[identity]
                rows.append({'id': identity, 'S': str(cost), 'entry_wait': str(entry), 'duration': str(duration), 'max_stop': str(peaks[identity])})
            ledger[arm] = sorted(rows, key=lambda x: x['id'])
            metrics[arm] = {'S': str(sum(D(v['S']) for v in rows)), 'entry_wait': str(sum(D(v['entry_wait']) for v in rows)), 'duration': str(sum(D(v['duration']) for v in rows)), 'max_stop': str(max(peaks.values())), 'arrived': len(rows), 'pending': 0}
            frozen = common['runs'][arm]['metrics']
            for field, key in [('S', 'S_sum_s'), ('entry_wait', 'source_schedule_entry_wait_s'), ('duration', 'in_network_duration_s'), ('max_stop', 'max_observed_continuous_stop_s')]:
                if abs(D(metrics[arm][field]) - D(str(frozen[key]))) > D('.000001'):
                    raise WorkflowError('frozen_metrics_mismatch')
            by_id = {v['id']: v['runs'][arm] for v in common['vehicles']}
            for v in rows:
                if D(v['S']) != D(by_id[v['id']]['S_text']) or abs(D(v['max_stop']) - D(str(by_id[v['id']]['max_continuous_stop']))) > D('.000001'):
                    raise WorkflowError('frozen_vehicle_mismatch')
            frames[arm] = count
            progress(arm + '_recalculated', {'frames': count, 'vehicles': len(rows)})
        q = {v['id']: v for v in ledger['q']}
        impacts = [{'id': v['id'], 'delta_S': str(D(v['S']) - D(q[v['id']]['S'])), 'delta_max_stop': str(D(v['max_stop']) - D(q[v['id']]['max_stop']))} for v in ledger['joint']]
        harmed = [v for v in impacts if D(v['delta_S']) > D('.000001')]
        delta = {k: str(D(metrics['joint'][k]) - D(metrics['q'][k])) for k in ('S', 'entry_wait', 'duration', 'max_stop')}
        guard()
        verify()
        progress('evidence_rechecked', {'identity_pairs': len(impacts)})
        return {'schema': 'offline_review_result_v1', 'kind': 'existing_native_pair_review', 'scenario': date, 'campus': 'SS', 'network_sha256': NETWORK, 'run_ids': {a: common['runs'][a]['run_id'] for a in ('q', 'joint')}, 'metrics': metrics, 'delta': delta, 'vehicles': ledger, 'impacts': impacts, 'harmed': harmed, 'benefited': sum(D(v['delta_S']) < -D('.000001') for v in impacts), 'unchanged': sum(abs(D(v['delta_S'])) <= D('.000001') for v in impacts), 'development_checks': {'S_non_regression': D(delta['S']) <= D('.2'), 'global_stop_non_regression': D(delta['max_stop']) <= D('.2'), 'harmed_fraction_reference': D(len(harmed)) / 23 <= D('.2')}, 'input_locks': locks, 'frames': frames, 'new_simulation_launches': 0, 'production_admitted': False, 'full_cohort_admitted': False, 'unseen_holdout': False, 'source_is_local_measured': False, 'limitations': ['既有原生执行的重新核算；未运行新仿真或模型。', '异地真实首次观测时序与校园路线假设迁移，非校园实测OD。', '开发日期已查阅；逐车条件准入不保证实际无人受损。', '保存为离线复核草案，不下发真实信号机。']}

class JobStore:
    def __init__(self, directory, max_jobs=8, wall_seconds=45, max_bytes=32 * 1024 * 1024):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.db = self.directory / 'workflow.sqlite3'
        self.max_jobs, self.wall_seconds, self.max_bytes = max_jobs, wall_seconds, max_bytes
        with self.connect() as db:
            db.executescript('CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, key TEXT UNIQUE, payload TEXT, status TEXT, stage TEXT, created REAL, updated REAL, result TEXT, result_sha TEXT, error TEXT); CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT, time REAL, stage TEXT, detail TEXT); CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY, job TEXT UNIQUE, created REAL, document TEXT, sha TEXT);')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.db, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            db.execute('PRAGMA foreign_keys=ON')
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def size_guard(self):
        if sum(p.stat().st_size for p in self.directory.glob('workflow.sqlite3*')) > self.max_bytes:
            raise WorkflowError('storage_budget_exhausted')

    def create(self, payload, key):
        if set(payload) != {'kind', 'scenario'} or payload.get('kind') != 'existing_native_pair_review' or payload.get('scenario') not in DATES:
            raise WorkflowError('invalid_job_request', 400)
        if not isinstance(key, str) or not re.fullmatch(r'[A-Za-z0-9_-]{8,80}', key):
            raise WorkflowError('invalid_idempotency_key', 400)
        body = encoded(payload)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            old = db.execute('SELECT * FROM jobs WHERE key=?', (key,)).fetchone()
            if old:
                if old['payload'] != body:
                    raise WorkflowError('idempotency_conflict')
                return self._job(db, old), False
            self.size_guard()
            if db.execute('SELECT COUNT(*) FROM jobs').fetchone()[0] >= self.max_jobs:
                raise WorkflowError('job_budget_exhausted')
            if db.execute("SELECT 1 FROM jobs WHERE status IN ('queued','running')").fetchone():
                raise WorkflowError('worker_busy')
            identity, now = uuid.uuid4().hex, time.time()
            db.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?)', (identity, key, body, 'queued', 'queued', now, now, None, None, None))
            db.execute('INSERT INTO events(job,time,stage,detail) VALUES(?,?,?,?)', (identity, now, 'queued', '{}'))
            return self._job(db, db.execute('SELECT * FROM jobs WHERE id=?', (identity,)).fetchone()), True

    def _job(self, db, row):
        value = {k: row[k] for k in ('id', 'status', 'stage', 'created', 'updated', 'error', 'result_sha')}
        value.update(json.loads(row['payload']))
        value['events'] = [{'sequence': v['seq'], 'time': v['time'], 'stage': v['stage'], 'detail': json.loads(v['detail'])} for v in db.execute('SELECT * FROM events WHERE job=? ORDER BY seq', (row['id'],))]
        value['result'] = json.loads(row['result']) if row['result'] else None
        if row['result'] and hashlib.sha256(row['result'].encode()).hexdigest() != row['result_sha']:
            raise WorkflowError('stored_result_changed')
        return value

    def get(self, identity):
        with self.connect() as db:
            row = db.execute('SELECT * FROM jobs WHERE id=?', (identity,)).fetchone()
            if not row:
                raise WorkflowError('job_not_found', 404)
            return self._job(db, row)

    def listing(self):
        with self.connect() as db:
            return [self._job(db, v) for v in db.execute('SELECT * FROM jobs ORDER BY created DESC')]

    def progress(self, identity, stage, detail=None):
        with self.connect() as db:
            now = time.time()
            db.execute("UPDATE jobs SET stage=?,updated=? WHERE id=? AND status='running'", (stage, now, identity))
            db.execute('INSERT INTO events(job,time,stage,detail) VALUES(?,?,?,?)', (identity, now, stage, encoded(detail or {})))

    def recover(self):
        # Must be called only by the exclusive server owner before its worker starts.
        with self.connect() as db:
            for row in db.execute("SELECT id FROM jobs WHERE status IN ('queued','running')").fetchall():
                now = time.time()
                db.execute("UPDATE jobs SET status='interrupted',stage='interrupted',error='service_restarted',updated=? WHERE id=?", (now, row['id']))
                db.execute('INSERT INTO events(job,time,stage,detail) VALUES(?,?,?,?)', (row['id'], now, 'interrupted', '{}'))

    def execute_one(self, catalog):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created LIMIT 1").fetchone()
            if row is None or db.execute("SELECT 1 FROM jobs WHERE status='running'").fetchone():
                return False
            identity, payload = row['id'], json.loads(row['payload'])
            db.execute("UPDATE jobs SET status='running',stage='starting',updated=? WHERE id=?", (time.time(), identity))
        started = time.monotonic()
        def guard():
            if time.monotonic() - started > self.wall_seconds:
                raise WorkflowError('wall_budget_exhausted')
            self.size_guard()
        try:
            self.progress(identity, 'starting')
            result = catalog.review(payload['scenario'], lambda s, d: self.progress(identity, s, d), guard)
            guard()
            body = encoded(result)
            if len(body.encode()) > 512 * 1024:
                raise WorkflowError('result_budget_exhausted')
            with self.connect() as db:
                now = time.time()
                db.execute("UPDATE jobs SET status='completed',stage='completed',result=?,result_sha=?,updated=? WHERE id=?", (body, hashlib.sha256(body.encode()).hexdigest(), now, identity))
                db.execute('INSERT INTO events(job,time,stage,detail) VALUES(?,?,?,?)', (identity, now, 'completed', encoded({'wall_seconds': time.monotonic() - started, 'new_simulation_launches': 0})))
        except Exception as exc:
            code = exc.code if isinstance(exc, WorkflowError) else 'review_failed'
            with self.connect() as db:
                now = time.time()
                db.execute("UPDATE jobs SET status='failed',stage='failed',error=?,updated=? WHERE id=?", (code, now, identity))
                db.execute('INSERT INTO events(job,time,stage,detail) VALUES(?,?,?,?)', (identity, now, 'failed', encoded({'code': code, 'diagnostic': str(exc)[:1000]})))
        return True

    def save_plan(self, identity, name, arm):
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 60 or any(ord(c) < 32 for c in name) or arm not in ('q', 'joint'):
            raise WorkflowError('invalid_plan', 400)
        job = self.get(identity)
        if job['status'] != 'completed':
            raise WorkflowError('job_not_completed')
        result = job['result']
        for file, expected in result['input_locks'].items():
            if digest(file) != expected:
                raise WorkflowError('source_changed')
        # Always bind a saved document to the exact result that was displayed.
        document = {'schema': 'offline_plan_draft_v1', 'name': name.strip(), 'job_id': identity, 'result_sha256': job['result_sha'], 'scenario': result['scenario'], 'campus': 'SS', 'network_sha256': result['network_sha256'], 'policy': arm, 'run_id': result['run_ids'][arm], 'metrics': result['metrics'][arm], 'pair_delta': result['delta'], 'harmed': result['harmed'], 'evidence_locks': result['input_locks'], 'scope': 'offline_review_draft', 'production_admitted': False, 'device_commands_emitted': 0, 'new_simulation_launches': 0, 'limitations': result['limitations']}
        body = encoded(document)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            current = db.execute('SELECT result_sha FROM jobs WHERE id=?', (identity,)).fetchone()
            if current['result_sha'] != job['result_sha']:
                raise WorkflowError('stored_result_changed')
            old = db.execute('SELECT * FROM plans WHERE job=?', (identity,)).fetchone()
            if old:
                if old['document'] != body:
                    raise WorkflowError('plan_already_saved')
                return self._plan(old)
            self.size_guard()
            pid = uuid.uuid4().hex
            db.execute('INSERT INTO plans VALUES(?,?,?,?,?)', (pid, identity, time.time(), body, hashlib.sha256(body.encode()).hexdigest()))
            return self._plan(db.execute('SELECT * FROM plans WHERE id=?', (pid,)).fetchone())

    def _plan(self, row):
        if hashlib.sha256(row['document'].encode()).hexdigest() != row['sha']:
            raise WorkflowError('stored_plan_changed')
        return {'id': row['id'], 'created': row['created'], 'sha256': row['sha'], 'document': json.loads(row['document'])}

    def plans(self):
        with self.connect() as db:
            return [self._plan(v) for v in db.execute('SELECT * FROM plans ORDER BY created DESC')]

class OwnerLock:
    """OS-released exclusive owner; stale file alone never proves a live worker."""
    def __init__(self, directory):
        import msvcrt
        import os
        self.file = (Path(directory) / 'owner.lock').open('a+b')
        if os.fstat(self.file.fileno()).st_size == 0:
            self.file.write(b'1'); self.file.flush()
        self.file.seek(0)
        try:
            msvcrt.locking(self.file.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            self.file.close()
            raise WorkflowError('workspace_already_owned')
    def close(self):
        self.file.close()

class Worker:
    def __init__(self, store, catalog):
        self.store, self.catalog = store, catalog
        self.stop = threading.Event()
        self.thread = threading.Thread(target=self.loop, daemon=True, name='offline-review-worker')
    def loop(self):
        while not self.stop.is_set():
            if not self.store.execute_one(self.catalog):
                self.stop.wait(.1)
    def start(self):
        self.thread.start()
