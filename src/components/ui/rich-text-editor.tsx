
'use client';

import React from 'react';
import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  setOptions?: Record<string, unknown>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, setOptions }) => {
  return (
    <SunEditor
      setContents={value}
      onChange={onChange}
      placeholder={placeholder}
      setOptions={{
        buttonList: [
          ['undo', 'redo'],
          ['font', 'fontSize', 'formatBlock'],
          ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
          ['fontColor', 'hiliteColor', 'removeFormat'],
          ['outdent', 'indent'],
          ['align', 'horizontalRule', 'list', 'lineHeight'],
          ['table', 'link', 'image'],
          ['fullScreen', 'showBlocks', 'codeView'],
        ],
        minHeight: "400px",
        height: "auto",
        ...setOptions,
      }}
    />
  );
};
      
export default RichTextEditor;
