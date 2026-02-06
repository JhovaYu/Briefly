import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import * as Y from 'yjs';
import { useEffect, useState } from 'react';

interface EditorProps {
    doc: Y.Doc;
    provider: any; // WebrtcProvider
    user: { name: string; color: string };
}

export const Editor = ({ doc, provider, user }: EditorProps) => {
    const [status, setStatus] = useState('connecting');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // Yjs handles history
            } as any),
            Collaboration.configure({
                document: doc,
            }),
            CollaborationCursor.configure({
                provider: provider,
                user: user,
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
    });

    useEffect(() => {
        if (provider) {
            setStatus('connected');
        }
    }, [provider]);

    if (!editor) {
        return null;
    }

    return (
        <div className="editor-container">
            <div className="editor-toolbar p-2 border-b border-gray-200 flex gap-2 overflow-x-auto">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className="p-1 border rounded hover:bg-gray-100">Bold</button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className="p-1 border rounded hover:bg-gray-100">Italic</button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className="p-1 border rounded hover:bg-gray-100">Strike</button>
                <button onClick={() => editor.chain().focus().toggleCode().run()} className="p-1 border rounded hover:bg-gray-100">Code</button>
                <button onClick={() => editor.chain().focus().setParagraph().run()} className="p-1 border rounded hover:bg-gray-100">P</button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="p-1 border rounded hover:bg-gray-100">H1</button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1 border rounded hover:bg-gray-100">H2</button>
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="p-1 border rounded hover:bg-gray-100">List</button>
                <button onClick={() => editor.chain().focus().toggleTaskList().run()} className="p-1 border rounded hover:bg-gray-100">Task</button>
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1 border rounded hover:bg-gray-100">Table</button>
            </div>
            <EditorContent editor={editor} className="prose max-w-none p-4 min-h-[500px] outline-none" />
            <div className="text-xs text-gray-400 p-2">Status: {status}</div>
        </div>
    );
};
