"""Resolve explicitly registered provenance labels, never fall back to old files."""
from pathlib import Path, PureWindowsPath
from offline_workflow_v1 import WorkflowError, digest
from portable_asset_registry_v1 import legacy_relative, relative_name, contained_file, valid_sha

class EvidenceResolver:
    def __init__(self, root, source_root_label, registry):
        self.root=Path(root).resolve(strict=True)
        self.source_root_label=source_root_label
        self.registry={relative_name(k).casefold():valid_sha(v)for k,v in registry.items()}
        if len(self.registry)!=len(registry):raise ValueError('duplicate normalized evidence')

    def verify(self, locks):
        if type(locks)is not dict or not locks:raise WorkflowError('source_changed')
        verified=[]
        for label,expected in locks.items():
            try:
                valid_sha(expected)
                # New results refer to this deployment; old records keep source labels.
                roots=[str(self.root),self.source_root_label]
                relative=None
                for root in roots:
                    try:relative=legacy_relative(label,root);break
                    except ValueError:pass
                if relative is None or self.registry.get(relative.casefold())!=expected:raise ValueError('unregistered evidence')
                path=contained_file(self.root,relative)
                if digest(path)!=expected:raise ValueError('evidence bytes differ')
                verified.append(path)
            except(OSError,ValueError,TypeError)as exc:raise WorkflowError('source_changed')from exc
        return verified
