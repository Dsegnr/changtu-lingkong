"""Relocate input bindings while retaining the frozen business review logic."""
import json
from pathlib import Path
from offline_workflow_v1 import NativeCatalog,WorkflowError,DATES,NATIVE_SEAL,PRODUCT_SEAL,digest
from portable_asset_registry_v1 import legacy_relative,relative_name,contained_file,valid_sha

def relative_lock_index(locks,source_root_label):
    if type(locks)is not dict:raise ValueError('source input-lock dictionary required')
    result={}
    for path,value in locks.items():
        rel=legacy_relative(path,source_root_label);key=rel.casefold();valid_sha(value)
        if key in result:raise ValueError('duplicate or conflicting normalized source path')
        result[key]=value
    return result

def expected_lock(index,relative):
    key=relative_name(relative).casefold()
    if key not in index:raise ValueError('unregistered relative input')
    return valid_sha(index[key])

def verified_bound_file(root,relative,expected):
    try:
        valid_sha(expected);file=contained_file(root,relative)
        if digest(file)!=expected:raise ValueError('copied input differs')
        return file
    except(OSError,ValueError)as error:raise WorkflowError('source_changed')from error

class RelocatableNativeCatalog(NativeCatalog):
    """No original data-root fallback; the source root is only a lexical label."""
    def __init__(self,root,source_root_label):
        super().__init__(Path(root).resolve(strict=True));self.source_root_label=source_root_label

    def files(self,date):
        if date not in DATES:raise WorkflowError('invalid_scenario',400)
        paths={}
        def add(relative,expected):
            file=verified_bound_file(self.root,relative,expected);paths[str(file)]=expected;return file
        native_path=add('outputs/fluid_crossdate_native_20261029_01/MANIFEST.json',NATIVE_SEAL)
        product_path=add('outputs/fluid_joint_product_20261029_01/MANIFEST.json',PRODUCT_SEAL)
        native=json.loads(native_path.read_text('utf8'));product=json.loads(product_path.read_text('utf8'))
        source_locks=add('outputs/fluid_joint_product_20261029_01/input_locks.json',product['input_locks.json'])
        try:index=relative_lock_index(json.loads(source_locks.read_text('utf8')),self.source_root_label)
        except(ValueError,TypeError)as error:raise WorkflowError('source_changed')from error
        for suffix in('_mapping.json','.rou.xml'):
            rel='data/fluid_crossdate_demand_20261029_01/'+date+suffix;add(rel,expected_lock(index,rel))
        for arm in('q','joint'):
            for name in('tripinfo.xml','fcd.xml','independent_audit.json'):
                rel=f'{date}/{arm}/{name}';add('outputs/fluid_crossdate_native_20261029_01/'+rel,native[rel])
        for name in(date+'_common.json',date+'_analysis.json'):add('outputs/fluid_joint_product_20261029_01/'+name,product[name])
        for name in('network.net.xml','contract.json'):
            rel='data/connected_campus_network_four_20261023_02/'+name;add(rel,expected_lock(index,rel))
        return paths
