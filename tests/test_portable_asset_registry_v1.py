from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from portable_asset_registry_v1 import ASSET_NAMES,AssetRegistry,AssetIntegrityError,legacy_relative,relative_name

class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.parent=ROOT/'.planning/portable_asset_registry_20261029/test_temp';self.parent.mkdir(parents=True,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=self.parent);self.area=Path(self.temp.name);self.root=self.area/'project';self.root.mkdir()
        def clean():
            Path(self.temp.name).resolve().relative_to(self.parent.resolve());self.temp.cleanup()
        self.addCleanup(clean)
        self.doc=dict(schema='portable_asset_registry_v1',source_product_manifest_sha256='a'*64,source_bindings_sha256='b'*64,source_input_locks_sha256='c'*64,assets={})
        for name in ASSET_NAMES:
            body=json.dumps({'asset':name}).encode();(self.root/(name+'.json')).write_bytes(body)
            self.doc['assets'][name]=dict(raw=dict(relative_path=name+'.json',sha256=hashlib.sha256(body).hexdigest(),bytes=len(body)),gzip=None)
    def registry(self,doc=None):
        b=json.dumps(self.doc if doc is None else doc).encode();(self.root/'portable_assets.json').write_bytes(b);return AssetRegistry(self.root,'portable_assets.json',hashlib.sha256(b).hexdigest())
    def test_relative_resolution_at_different_root(self):
        registry=self.registry();self.assertEqual(json.loads(registry.read('index'))['asset'],'index')
    def test_windows_root_case_and_separators(self):self.assertEqual(legacy_relative('d:/比赛/项目/outputs/a.json','D:\\比赛\\项目'),'outputs/a.json')
    def test_cross_drive_unc_and_similar_root_prefix_rejected(self):
        for value in ['E:/比赛/项目/a.json','D:/比赛/项目2/a.json','\\\\server\\share\\a.json','a.json']:
            self.assertRaises(ValueError,legacy_relative,value,'D:/比赛/项目')
    def test_legacy_traversal_rejected(self):
        for value in ['D:/比赛/项目/../a.json','D:/比赛/项目/./a.json']:
            self.assertRaises(ValueError,legacy_relative,value,'D:/比赛/项目')
    def test_canonical_runtime_paths(self):
        for value in ['../a.json','D:/a.json','/a.json','a\\b.json','a//b.json','a/./b.json','NUL.json','a./b.json','a:stream','a\x00b']:
            self.assertRaises(ValueError,relative_name,value)
    def test_registry_hash_required(self):
        self.registry();self.assertRaises(AssetIntegrityError,AssetRegistry,self.root,'portable_assets.json','0'*64)
    def test_tampered_asset_not_served(self):
        registry=self.registry();(self.root/'index.json').write_bytes(b'changed');self.assertRaises(AssetIntegrityError,registry.read,'index')
    def test_missing_asset_has_no_legacy_fallback(self):
        registry=self.registry();(self.root/'index.json').unlink();self.assertRaises(FileNotFoundError,registry.read,'index')
    def test_unknown_name_rejected(self):self.assertRaises(FileNotFoundError,self.registry().read,'../index')
    def test_complete_registry_required(self):
        d=deepcopy(self.doc);del d['assets']['context'];self.assertRaises(ValueError,self.registry,d)
    def test_encoding_quality_and_absent_gzip(self):
        registry=self.registry();self.assertEqual(registry.encoding('index','gzip'),'raw');self.assertEqual(registry.encoding('index','gzip;q=0, identity;q=1'),'raw');self.assertRaises(ValueError,registry.encoding,'index','gzip;q=1, identity;q=0')
    def test_real_junction_outside_deployment_root_rejected(self):
        outside=self.area/'outside';outside.mkdir();(outside/'index.json').write_bytes(b'not a registered public asset');link=self.root/'escape'
        quote=lambda p:"'"+str(p).replace("'","''")+"'"
        command='New-Item -ItemType Junction -Path '+quote(link)+' -Target '+quote(outside)+' -ErrorAction Stop | Out-Null'
        result=subprocess.run(['powershell','-NoProfile','-Command',command],capture_output=True,timeout=10,creationflags=subprocess.CREATE_NO_WINDOW)
        if result.returncode:self.skipTest('Windows junction creation unavailable; no permission change attempted')
        try:
            d=deepcopy(self.doc);d['assets']['index']['raw']['relative_path']='escape/index.json';self.assertRaises(ValueError,self.registry,d);self.assertTrue((outside/'index.json').exists())
        finally:os.rmdir(link)
if __name__=='__main__':unittest.main()
