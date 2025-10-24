import { ArrowLeftIcon, CopyCheckIcon, CopyIcon, Save, Edit3 } from "lucide-react";
import { useState, useMemo, useCallback, Fragment, useEffect } from "react";

import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { CodeView } from "@/components/code-view";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
    BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { convertFilesToTreeItems } from "@/lib/utils";
import TreeView from "@/components/tree-view";
import Editor from '@monaco-editor/react';
import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react";




type FileCollection = { [path: string]: string };

function getLanguageFromExtension(filename: string): string {
    const extension = filename.split(".").pop()?.toLowerCase();
    return extension || "text";
}

interface FileBreadcrumbProps {
    filepath: string;
}

const FileBreadcrumb = ({ filepath }: FileBreadcrumbProps) => {
    const pathSegments = filepath.split("/");
    const maxSegments = 3; // Reduced from 4 to 3 for more compact display

    const renderBreadCrumbItems = () => {
        if (pathSegments.length <= maxSegments) {
            // show all segments if 3 or less
            return pathSegments.map((segment, index) => {
                const isLast = index === pathSegments.length - 1;

                return (
                    <Fragment key={index}>
                        <BreadcrumbItem>
                            {isLast ? (
                                <BreadcrumbPage className="font-medium text-sm text-white truncate max-w-[200px]">
                                    {segment}
                                </BreadcrumbPage>
                            ) : (
                                <span className="text-white/60 text-xs">
                                    {segment}
                                </span>
                            )}
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator className="text-white/40" />}
                    </Fragment>
                )
            })
        } else {
            const firstSegment = pathSegments[0];
            const lastSegment = pathSegments[pathSegments.length - 1];

            return (
                <>
                    <BreadcrumbItem>
                        <span className="text-white/60 text-xs">
                            {firstSegment}
                        </span>
                        <BreadcrumbSeparator className="text-white/40" />
                        <BreadcrumbItem>
                            <BreadcrumbEllipsis className="text-white/40" />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-white/40" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-medium text-sm text-white truncate max-w-[150px]">
                                {lastSegment}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbItem>
                </>
            )
        }
    }
    
    return (
        <Breadcrumb>
            <BreadcrumbList className="text-xs">
                {renderBreadCrumbItems()}
            </BreadcrumbList>
        </Breadcrumb>
    )
}

// Compact Tree View Component for File Explorer
interface CompactTreeViewProps {
    data: any[];
    value?: string | null;
    onSelect: (value: string) => void;
}

const CompactTreeView = ({ data, value, onSelect }: CompactTreeViewProps) => {
    return (
        <div className="p-1">
            {data.map((item, index) => (
                <CompactTree 
                    key={index} 
                    item={item}
                    selectedValue={value}
                    onSelect={onSelect}
                    parentPath=""
                    level={0}
                />
            ))}
        </div>
    );
};

interface CompactTreeProps {
    item: any;
    selectedValue?: string | null;
    onSelect?: (value: string) => void;
    parentPath: string;
    level: number;
}

const CompactTree = ({ item, selectedValue, onSelect, parentPath, level }: CompactTreeProps) => {
    const [isOpen, setIsOpen] = useState(true);
    const [name, ...items] = Array.isArray(item) ? item : [item];
    const currentPath = parentPath ? `${parentPath}/${name}` : name;

    if (!items.length) {
        // It's a file
        const isSelected = selectedValue === currentPath;
        return (
            <div 
                className={`flex items-center py-1 px-2 cursor-pointer hover:bg-white/20 rounded text-xs ${
                    isSelected ? 'bg-white/10 text-white' : 'text-white/70 hover:text-black'
                }`}
                style={{ paddingLeft: `${8 + level * 12}px` }}
                onClick={() => onSelect?.(currentPath)}
            >
                <FileIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate text-xs">{name}</span>
            </div>
        );
    }

    // It's a folder
    return (
        <div>
            <div 
                className="flex items-center py-1 px-2 cursor-pointer hover:bg-white/20 rounded text-xs text-white/70 hover:text-black"
                style={{ paddingLeft: `${8 + level * 12}px` }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <ChevronRightIcon 
                    className={`h-3 w-3 mr-2 flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-90' : ''
                    }`} 
                />
                <FolderIcon className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="truncate text-xs">{name}</span>
            </div>
            
            {isOpen && (
                <div>
                    {items.map((subItem, index) => (
                        <CompactTree 
                            key={index}
                            item={subItem}
                            selectedValue={selectedValue}
                            onSelect={onSelect}
                            parentPath={currentPath}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface FileExplorerProps {
    files: FileCollection;
    onFileChange?: (filePath: string, content: string) => void;
    editable?: boolean;
}

export const FileExplorer = ({ files, onFileChange, editable = true }: FileExplorerProps) => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState<string>('');

    // Initialize with first file when files are available
    useEffect(() => {
        if (!selectedFile && Object.keys(files).length > 0) {
            setSelectedFile(Object.keys(files)[0]);
        }
    }, [files]);

    const treeData = useMemo(() => {
        return convertFilesToTreeItems(files);
    }, [files]);

    const handleFileSelect = useCallback((filePath: string) => {
        if (files[filePath]) {
            setSelectedFile(filePath);
            setEditedContent(files[filePath]);
            setIsEditing(false);
        }
    }, [files]);
    
    const handleCopy = useCallback(() => {
        if(selectedFile) {
            navigator.clipboard.writeText(files[selectedFile]);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
            }, 2000);
        }
    }, [selectedFile, files]);

    const handleEdit = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleSave = useCallback(() => {
        if (selectedFile && onFileChange) {
            onFileChange(selectedFile, editedContent);
            setIsEditing(false);
        }
    }, [selectedFile, editedContent, onFileChange]);

    const handleCancel = useCallback(() => {
        setEditedContent(files[selectedFile || '']);
        setIsEditing(false);
    }, [selectedFile, files]);

    const getLanguageFromExtension = (filename: string): string => {
        const extension = filename.split(".").pop()?.toLowerCase();
        const languageMap: { [key: string]: string } = {
            'sol': 'solidity',
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'py': 'python',
            'json': 'json',
            'md': 'markdown',
            'toml': 'toml',
            'txt': 'plaintext',
            'yaml': 'yaml',
            'yml': 'yaml',
        };
        return languageMap[extension || ''] || 'plaintext';
    };

    return (
        <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-sidebar">
                <div className="h-full flex flex-col">
                    <div className="p-2 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white/80">Files</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto thin-scrollbar">
                        <CompactTreeView
                            data={treeData}
                            value={selectedFile}
                            onSelect={handleFileSelect}
                        />
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle className="hover:bg-primary transition-colors" />
            <ResizablePanel defaultSize={75} minSize={65} >
                {selectedFile && files[selectedFile] ? (
                    <div className="h-full w-full flex flex-col ">
                        <div className="border-b bg-sidebar px-3 py-2 flex justify-between items-center gap-x-2">
                           <div className="flex-1 min-w-0">
                               <FileBreadcrumb filepath={selectedFile}/>
                           </div>
                           <div className="flex items-center gap-x-1 flex-shrink-0">
                               {editable && !isEditing && (
                                   <Hint text="Edit file" side="bottom">
                                       <Button variant="outline" size="sm"
                                           onClick={handleEdit}
                                           className="h-7 w-7 p-0"
                                       >
                                           <Edit3 className="h-3 w-3" />
                                       </Button>
                                   </Hint>
                               )}
                               {editable && isEditing && (
                                   <>
                                       <Hint text="Save changes" side="bottom">
                                           <Button variant="outline" size="sm"
                                               onClick={handleSave}
                                               className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                           >
                                               <Save className="h-3 w-3" />
                                           </Button>
                                       </Hint>
                                       <Hint text="Cancel editing" side="bottom">
                                           <Button variant="outline" size="sm"
                                               onClick={handleCancel}
                                               className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                           >
                                               ×
                                           </Button>
                                       </Hint>
                                   </>
                               )}
                               <Hint text="copy to clipboard" side="bottom" >
                                   <Button variant="outline" size="sm"
                                       onClick={handleCopy}
                                       disabled={copied}
                                       className="h-7 w-7 p-0"
                                   >
                                       {copied ? <CopyCheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                                   </Button>
                               </Hint>
                           </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {isEditing ? (
                                <Editor
                                    height="100%"
                                    defaultLanguage={getLanguageFromExtension(selectedFile)}
                                    value={editedContent}
                                    onChange={(value) => setEditedContent(value || '')}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        readOnly: false,
                                        padding: { top: 12, bottom: 12 },
                                        wordWrap: 'on',
                                        automaticLayout: true,
                                        lineHeight: 18,
                                        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                                        scrollbar: {
                                            vertical: 'auto',
                                            horizontal: 'auto',
                                            verticalScrollbarSize: 4,
                                            horizontalScrollbarSize: 4,
                                            useShadows: false,
                                            verticalHasArrows: false,
                                            horizontalHasArrows: false,
                                        },
                                    }}
                                />
                            ) : (
                                <Editor
                                    height="100%"
                                    defaultLanguage={getLanguageFromExtension(selectedFile)}
                                    value={files[selectedFile]}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        readOnly: true,
                                        padding: { top: 12, bottom: 12 },
                                        wordWrap: 'on',
                                        automaticLayout: true,
                                        lineHeight: 18,
                                        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                                        scrollbar: {
                                            vertical: 'auto',
                                            horizontal: 'auto',
                                            verticalScrollbarSize: 4,
                                            horizontalScrollbarSize: 4,
                                            useShadows: false,
                                            verticalHasArrows: false,
                                            horizontalHasArrows: false,
                                        },
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )
                    : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Select a file to view it&apos;s content
                        </div>
                    )
                }
            </ResizablePanel>
        </ResizablePanelGroup>
    )

}



