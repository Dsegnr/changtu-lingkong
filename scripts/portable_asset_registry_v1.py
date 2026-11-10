"""Immutable relative asset registry. Runtime has no legacy-root fallback."""
import hashlib
import json
from pathlib import Path,PureWindowsPath

ASSET_NAMES=frozenset({'index','context','gis','20250120_video_common','20250120_video_analysis','20250120_video_q','20250120_video_joint'})
class AssetIntegrityError(ValueError):pass

def digest(data):return hashlib.sha256(data).hexdigest()
def valid_sha(value):
    if type(value)is not str or len(value)!=64 or any(c not in'0123456789abcdef'for c in value):raise ValueError('SHA256 required')
    return value

def relative_name(value):
    if type(value)is not str or not value or any(c in value for c in '\\:\x00<>"|?*')or value.startswith('/'):raise ValueError('canonical relative POSIX name required')
    parts=value.split('/')
    if any(not p or p in('.','..')or p.rstrip(' .')!=p or PureWindowsPath(p).is_reserved()for p in parts):raise ValueError('noncanonical or reserved component')
    return value

def legacy_relative(value,original_root):
    if type(value)is not str or type(original_root)is not str:raise ValueError('explicit Windows source root')
    for v in(value,original_root):
        if '\x00'in v or any(p in('.','..')for p in v.replace('\\','/').split('/')):raise ValueError('legacy traversal rejected')
    p,r=PureWindowsPath(value),PureWindowsPath(original_root)
    if not p.is_absolute()or not r.is_absolute()or p.drive.startswith('\\')or r.drive.startswith('\\'):raise ValueError('local drive absolute source only')
    try:rel=p.relative_to(r).as_posix()
    except ValueError as error:raise ValueError('source outside registered project root')from error
    return relative_name(rel)

def contained_file(root,name):
    relative_name(name);base=Path(root).resolve(strict=True);path=(base/name).resolve(strict=True)
    try:path.relative_to(base)
    except ValueError as error:raise ValueError('resolved asset escapes deployment root')from error
    if not path.is_file():raise ValueError('registered asset is not a file')
    return path

class AssetRegistry:
    def __init__(self,root,registry_name,expected_sha256):
        self.root=Path(root).resolve(strict=True);file=contained_file(self.root,registry_name);body=file.read_bytes()
        if digest(body)!=valid_sha(expected_sha256):raise AssetIntegrityError('registry hash differs')
        d=json.loads(body)
        if set(d)!={'schema','source_product_manifest_sha256','source_bindings_sha256','source_input_locks_sha256','assets'}or d['schema']!='portable_asset_registry_v1'or set(d['assets'])!=ASSET_NAMES:raise ValueError('registry schema/names')
        for k in('source_product_manifest_sha256','source_bindings_sha256','source_input_locks_sha256'):valid_sha(d[k])
        for row in d['assets'].values():
            if set(row)!={'raw','gzip'}or row['raw']is None:raise ValueError('raw asset required')
            for item in row.values():
                if item is None:continue
                if set(item)!={'relative_path','sha256','bytes'}or type(item['bytes'])is not int or item['bytes']<0:raise ValueError('asset descriptor')
                valid_sha(item['sha256']);contained_file(self.root,item['relative_path'])
        self.document=d;self.registry_sha256=expected_sha256

    def read(self,name,encoding='raw'):
        if name not in ASSET_NAMES or encoding not in('raw','gzip'):raise FileNotFoundError('unregistered asset')
        item=self.document['assets'][name][encoding]
        if item is None:raise FileNotFoundError('encoding unavailable')
        path=contained_file(self.root,item['relative_path'])
        with path.open('rb')as f:data=f.read(item['bytes']+1)
        if len(data)!=item['bytes']or digest(data)!=item['sha256']:raise AssetIntegrityError('asset hash/length differs')
        return data

    def encoding(self,name,accept_encoding):
        if name not in ASSET_NAMES:raise FileNotFoundError('unregistered asset')
        quality={}
        for part in accept_encoding.split(','):
            fields=part.strip().split(';');kind=fields[0].strip().lower()
            if not kind:continue
            q=1.
            try:
                for f in fields[1:]:
                    if f.strip().startswith('q='):q=float(f.strip()[2:])
            except ValueError:q=0.
            quality[kind]=q if 0<=q<=1 else 0.
        gzip_q=quality.get('gzip',quality.get('*',0.));identity_q=quality.get('identity',0. if quality.get('*')==0. else 1.)
        if self.document['assets'][name]['gzip']is not None and gzip_q>0 and gzip_q>=identity_q:return'gzip'
        if identity_q>0:return'raw'
        if self.document['assets'][name]['gzip']is not None and gzip_q>0:return'gzip'
        raise ValueError('no acceptable representation')
