"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import SunEditor from "suneditor-react";
import plugins from "suneditor/src/plugins";
import "suneditor/dist/css/suneditor.min.css";
import "./rich-text-editor.css";

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  onBlur?: (event: Event, editorContents: string) => void;
  placeholder?: string;
  setOptions?: Record<string, unknown>;
  defaultValue?: string;
  width?: string;
  height?: string;
  disable?: boolean;
  hide?: boolean;
  hideToolbar?: boolean;
  disableToolbar?: boolean;
  autoFocus?: boolean;
}

export interface RichTextEditorRef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEditor: () => any;
  getContents: () => string;
  setContents: (contents: string) => void;
}

// Custom Variables Plugin for SunEditor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const variablesPlugin: any = {
  name: "variables",
  display: "submenu",
  title: "Insert Variable",
  innerHTML:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>',
  buttonClass: "se-btn-variables",

  // @Required
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add: function (core: any, targetElement: any) {
    const context = core.context;
    context.variables = {
      targetButton: targetElement,
    };

    // Generate submenu HTML - Always bind "core" when calling a plugin function
    const listDiv = this.setSubmenu.call(this, core);

    // Add event listeners - Handle click events inline to avoid 'this' aliasing
    listDiv
      .querySelector(".se-list-inner")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;
        const button = target.closest(".se-btn-list") as HTMLButtonElement;

        if (!button) return;

        const variable = button.getAttribute("data-value");
        if (variable) {
          // Use core.functions.insertHTML as per SunEditor API
          core.functions.insertHTML(variable, true);
          core.submenuOff();
        }
      });

    // @Required - You must add the "submenu" element using the "core.initMenuTarget" method
    core.initMenuTarget(this.name, targetElement, listDiv);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSubmenu: function (core: any) {
    const listDiv = core.util.createElement("DIV");
    listDiv.className = "se-submenu se-list-layer se-variables-submenu";
    listDiv.style.cssText = "background-color: #ffffff !important; opacity: 1 !important;";
    listDiv.innerHTML = `<div class="se-list-inner se-list-font-size" style="max-height: 400px; overflow-y: auto; background-color: #ffffff !important; opacity: 1 !important;">
        <ul class="se-list-basic" style="background-color: #ffffff !important; opacity: 1 !important;">
          <li class="se-list-title" style="padding: 8px 12px; font-weight: 600; font-size: 11px; color: #666;">RECIPIENT VARIABLES</li>
          <li><button type="button" class="se-btn-list" data-value="{{first_name}}" title="Recipient's first name">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>First Name</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{first_name}}</span>
          </button></li>
          <li><button type="button" class="se-btn-list" data-value="{{last_name}}" title="Recipient's last name">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Last Name</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{last_name}}</span>
          </button></li>
          <li><button type="button" class="se-btn-list" data-value="{{full_name}}" title="Recipient's full name">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>Full Name</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{full_name}}</span>
          </button></li>
          <li><button type="button" class="se-btn-list" data-value="{{email}}" title="Recipient's email">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              <span>Email</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{email}}</span>
          </button></li>
          <li><button type="button" class="se-btn-list" data-value="{{mobile}}" title="Recipient's mobile">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              <span>Mobile</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{mobile}}</span>
          </button></li>
          
          <li class="se-list-title" style="padding: 8px 12px; font-weight: 600; font-size: 11px; color: #666; margin-top: 8px; border-top: 1px solid #e0e0e0;">COMPANY VARIABLES</li>
          <li><button type="button" class="se-btn-list" data-value="{{company_name}}" title="Company name">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M6 3h12v18H6V3z"></path></svg>
              <span>Company Name</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{company_name}}</span>
          </button></li>
          <li><button type="button" class="se-btn-list" data-value="{{address}}" title="Company address">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>Address</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{address}}</span>
          </button></li>
          <li><button type="button" class="se-btn-list" data-value="{{country}}" title="Country">
            <span style="display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" x2="22" y1="12" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span>Country</span>
            </span>
            <span style="font-size: 11px; color: #888; margin-left: 22px;">{{country}}</span>
          </button></li>
        </ul>
      </div>`;

    return listDiv;
  },
};

export const RichTextEditor = forwardRef<
  RichTextEditorRef,
  RichTextEditorProps
>(({ 
  value, 
  onChange, 
  onBlur, 
  placeholder, 
  setOptions,
  defaultValue,
  width = "100%",
  height = "auto",
  disable = false,
  hide = false,
  hideToolbar = false,
  disableToolbar = false,
  autoFocus = false,
}, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorInstanceRef = useRef<any>(null);
  const previousValueRef = useRef<string | undefined>(value);

  // Update editor content when prop changes (equivalent to componentDidUpdate)
  useEffect(() => {
    if (value !== previousValueRef.current && editorInstanceRef.current) {
      previousValueRef.current = value;
      
      // Only update if content is actually different to avoid unnecessary updates
      if (typeof editorInstanceRef.current.getContents === 'function' && 
          typeof editorInstanceRef.current.setContents === 'function') {
        try {
          const currentContent = editorInstanceRef.current.getContents(true);
          if (currentContent !== (value || "")) {
            editorInstanceRef.current.setContents(value || "", false);
            // Reset history after external content update (like componentDidUpdate example)
            if (editorInstanceRef.current.core?.history?.reset) {
              try {
                editorInstanceRef.current.core.history.reset(true);
              } catch {
                // Ignore history reset errors
              }
            }
          }
        } catch (error) {
          // Ignore errors if editor is not ready
          console.warn("Error updating editor content:", error);
        }
      }
    }
  }, [value]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSunEditorInstance = (sunEditor: any) => {
    if (sunEditor) {
      editorInstanceRef.current = sunEditor;
    }
  };

  // Handle onBlur event properly according to suneditor-react docs
  // onBlur receives (event, editorContents) parameters
  const handleBlur = (event: Event, editorContents: string) => {
    if (onBlur && typeof onBlur === 'function') {
      onBlur(event, editorContents);
    }
  };

  const handleChange = (content: string) => {
    previousValueRef.current = content;
    if (onChange) {
      onChange(content);
    }
  };

  React.useImperativeHandle(ref, () => ({
    getEditor: () => {
      return editorInstanceRef.current;
    },
    getContents: () => {
      if (editorInstanceRef.current && typeof editorInstanceRef.current.getContents === 'function') {
        try {
          return editorInstanceRef.current.getContents(true) || "";
        } catch (error) {
          console.warn("Error getting editor contents:", error);
          return "";
        }
      }
      return "";
    },
    setContents: (contents: string) => {
      if (editorInstanceRef.current && typeof editorInstanceRef.current.setContents === 'function') {
        try {
          editorInstanceRef.current.setContents(contents);
        } catch (error) {
          console.warn("Error setting editor contents:", error);
        }
      }
    },
  }));

  return (
    <div className="rich-text-editor-wrapper">
      <SunEditor
        getSunEditorInstance={getSunEditorInstance}
        setContents={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        width={width}
        height={height}
        disable={disable}
        hide={hide}
        hideToolbar={hideToolbar}
        disableToolbar={disableToolbar}
        autoFocus={autoFocus}
        setOptions={{
          plugins: { ...plugins, variablesPlugin },
          buttonList: [
            ["undo", "redo"],
            ["font", "fontSize", "formatBlock"],
            [
              "bold",
              "underline",
              "italic",
              "strike",
              "subscript",
              "superscript",
            ],
            ["fontColor", "hiliteColor", "removeFormat"],
            ["outdent", "indent"],
            ["align", "horizontalRule", "list", "lineHeight"],
            ["table", "link", "image"],
            ["fullScreen", "showBlocks", "codeView"],
            ["variables"], // Our custom plugin
          ],
          minHeight: "400px",
          defaultStyle: "font-family: inherit; font-size: 15px; line-height: 1.6;",
          charCounter: false,
          font: [
            "Arial",
            "Calibri",
            "Comic Sans MS",
            "Courier New",
            "Georgia",
            "Helvetica Neue",
            "Impact",
            "Lucida Console",
            "Tahoma",
            "Times New Roman",
            "Trebuchet MS",
            "Verdana",
          ],
          fontSize: [
            8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
          ],
          fontSizeUnit: "px",
          formats: ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6"],
          ...setOptions,
        }}
      />
    </div>
  );
});

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
