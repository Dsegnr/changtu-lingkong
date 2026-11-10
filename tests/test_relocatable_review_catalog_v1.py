import hashlib
from pathlib import Path
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from relocatable_review_catalog_v1 import relative_lock_index,expected_lock,verified_bound_file,RelocatableNativeCatalog
from offline_workflow_v1 import WorkflowError

class CatalogBindingTests(unittest.TestCase):
    def test_original_root_label_does_not_need_to_exist(self):
        index=relative_lock_index({'Q:/nonexistent/source/data/a.json':'a'*64},'Q:/nonexistent/source');self.assertEqual(expected_lock(index,'data/a.json'),'a'*64)
    def test_case_normalized_lookup(self):
        index=relative_lock_index({'d:/SOURCE/PROJECT/Data/A.json':'a'*64},'D:/source/project');self.assertEqual(expected_lock(index,'data/a.json'),'a'*64)
    def test_conflicting_alias_rejected(self):
        self.assertRaises(ValueError,relative_lock_index,{'D:/source/project/data/a':'a'*64,'d:/SOURCE/PROJECT/DATA/A':'b'*64},'D:/source/project')
    def test_same_hash_alias_also_rejected(self):
        self.assertRaises(ValueError,relative_lock_index,{'D:/source/project/data/a':'a'*64,'d:/SOURCE/PROJECT/DATA/A':'a'*64},'D:/source/project')
    def test_cross_root_drive_and_traversal_rejected(self):
        for name in ['E:/source/project/data/a','D:/source/project2/data/a','D:/source/project/../a']:
            self.assertRaises(ValueError,relative_lock_index,{name:'a'*64},'D:/source/project')
    def test_unknown_or_noncanonical_relative_key_rejected(self):
        index={'data/a':'a'*64}
        for name in ['data/b','../a','D:/a','data\\a']:self.assertRaises(ValueError,expected_lock,index,name)
    def test_invalid_hash_rejected(self):self.assertRaises(ValueError,relative_lock_index,{'D:/source/a':'notsha'},'D:/source')
    def test_real_copy_hash_and_missing_without_fallback(self):
        parent=ROOT/'.planning/relocatable_review_catalog_20261029/test_temp';parent.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=parent)as tmp:
            root=Path(tmp);root.resolve().relative_to(parent.resolve());file=root/'a';file.write_bytes(b'local copied bytes');h=hashlib.sha256(file.read_bytes()).hexdigest();self.assertEqual(verified_bound_file(root,'a',h),file.resolve())
            file.write_bytes(b'changed copy');self.assertRaises(WorkflowError,verified_bound_file,root,'a',h)
            self.assertRaises(WorkflowError,verified_bound_file,root,'missing',h)
            root.resolve().relative_to(parent.resolve())
    def test_unknown_date_rejected_before_loading_data(self):
        c=RelocatableNativeCatalog(ROOT,'D:/source/project');self.assertRaises(WorkflowError,c.files,'20250120_video')
if __name__=='__main__':unittest.main()
