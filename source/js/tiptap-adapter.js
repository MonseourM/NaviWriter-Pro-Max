// js/tiptap-adapter.js
// Optional Tiptap adapter for NaviWriter.
// Uses CDN imports. If imports fail, NaviWriter falls back to contenteditable.

let Editor = null;
let StarterKit = null;
let ImageExtension = null;
let TableKit = null;
let TextStyle = null;
let Color = null;
let Highlight = null;
let Underline = null;
let FontFamily = null;
let Extension = null;
let FontSize = null;
let NaviImage = null;
let tiptapEditor = null;
let suppressTiptapUpdate = false;
let Mark = null;
let InlineComment = null;

function clearTiptapMountElement(element) {
  if (!element) return;

  /*
    Important:
    The browser can restore old contenteditable DOM on reload.
    Tiptap then mounts its own ProseMirror tree inside the same element.
    Clearing the mount element prevents ghost/duplicate visual content.
  */
  element.innerHTML = '';

  /*
    Tiptap manages editing through its own ProseMirror element.
    Leaving contenteditable on the outer article can invite browser
    restoration weirdness.
  */
  element.removeAttribute('contenteditable');
}

async function importOptionalTiptapModule(url, label) {
  try {
    return await import(url);
  } catch (error) {
    console.warn(
      `Optional Tiptap module failed to load: ${label}`,
      error
    );

    return null;
  }
}

function removeTiptapGhostNodes(element) {
  if (!element) return;

  const proseMirror = element.querySelector('.ProseMirror');

  if (!proseMirror) return;

  Array.from(element.childNodes).forEach(node => {
    if (node === proseMirror) return;

    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.contains(proseMirror)
    ) {
      return;
    }

    node.remove();
  });
}

function setEngineStatus(text, className) {
  const el = document.getElementById('engineStatus');

  if (!el) return;

  el.textContent = text;
  el.classList.remove('engine-tiptap', 'engine-fallback', 'engine-error');

  if (className) {
    el.classList.add(className);
  }
}

window.NaviTiptapReady = (async () => {
  try {
   const CoreModule =
  await import('https://esm.sh/@tiptap/core@3.27.3');

const StarterKitModule =
  await import('https://esm.sh/@tiptap/starter-kit@3.27.3');

const [
  ImageModule,
  TableModule,
  TextStyleModule,
  ColorModule,
  HighlightModule,
  UnderlineModule,
  FontFamilyModule
] = await Promise.all([
  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-image@3.27.3',
    'image'
  ),

  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-table@3.27.3',
    'table'
  ),

  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-text-style@3.27.3',
    'text-style'
  ),

  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-color@3.27.3',
    'color'
  ),

  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-highlight@3.27.3',
    'highlight'
  ),

  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-underline@3.27.3',
    'underline'
  ),

  importOptionalTiptapModule(
    'https://esm.sh/@tiptap/extension-font-family@3.27.3',
    'font-family'
  )
]);


Editor =
  CoreModule.Editor;

Extension =
  CoreModule.Extension || null;
    
    Mark =
  CoreModule.Mark || null;

StarterKit =
  StarterKitModule.default ||
  StarterKitModule.StarterKit ||
  null;

ImageExtension =
  ImageModule?.default ||
  ImageModule?.Image ||
  null;

TableKit =
  TableModule?.TableKit ||
  TableModule?.default ||
  null;

TextStyle =
  TextStyleModule?.TextStyle ||
  TextStyleModule?.default ||
  null;

Color =
  ColorModule?.Color ||
  ColorModule?.default ||
  null;

Highlight =
  HighlightModule?.Highlight ||
  HighlightModule?.default ||
  null;

Underline =
  UnderlineModule?.Underline ||
  UnderlineModule?.default ||
  null;

FontFamily =
  FontFamilyModule?.FontFamily ||
  FontFamilyModule?.default ||
  null;


if (Extension && TextStyle) {
  FontSize =
    Extension.create({
      name: 'fontSize',

      addOptions() {
        return {
          types: ['textStyle']
        };
      },

      addGlobalAttributes() {
        return [
          {
            types: this.options.types,
            attributes: {
              fontSize: {
                default: null,

                parseHTML: element => {
                  return element.style.fontSize || null;
                },

                renderHTML: attributes => {
                  if (!attributes.fontSize) {
                    return {};
                  }

                  return {
                    style: `font-size: ${attributes.fontSize}`
                  };
                }
              }
            }
          }
        ];
      },

      addCommands() {
        return {
          setFontSize:
            fontSize =>
            ({ chain }) => {
              return chain()
                .setMark('textStyle', {
                  fontSize
                })
                .run();
            },

          unsetFontSize:
            () =>
            ({ chain }) => {
              return chain()
                .setMark('textStyle', {
                  fontSize: null
                })
                .removeEmptyTextStyle()
                .run();
            }
        };
      }
    });
}
    
    if (Mark) {
  InlineComment =
    Mark.create({
      name: 'inlineComment',

      inclusive: false,

      addAttributes() {
        return {
          id: {
            default: null,

            parseHTML: element => {
              return element.getAttribute(
                'data-inline-comment-id'
              );
            },

            renderHTML: attributes => {
              if (!attributes.id) {
                return {};
              }

              return {
                'data-inline-comment-id': attributes.id
              };
            }
          }
        };
      },

      parseHTML() {
        return [
          {
            tag: 'span[data-inline-comment-id]'
          }
        ];
      },

      renderHTML({ HTMLAttributes }) {
        return [
          'span',
          {
            ...HTMLAttributes,
            class: [
              HTMLAttributes.class,
              'inline-comment-mark'
            ]
              .filter(Boolean)
              .join(' ')
          },
          0
        ];
      },

      addCommands() {
        return {
          setInlineComment:
            id =>
            ({ chain }) => {
              return chain()
                .setMark('inlineComment', {
                  id
                })
                .run();
            },

          unsetInlineComment:
            () =>
            ({ chain }) => {
              return chain()
                .unsetMark('inlineComment')
                .run();
            }
        };
      }
    });
}


console.log('Tiptap loaded extensions:', {
  hasTextStyle: Boolean(TextStyle),
  hasColor: Boolean(Color),
  hasHighlight: Boolean(Highlight),
  hasUnderline: Boolean(Underline),
  hasFontFamily: Boolean(FontFamily),
  hasFontSize: Boolean(FontSize),
  hasTableKit: Boolean(TableKit),
  hasImage: Boolean(ImageExtension)
});




if (ImageExtension) {
  NaviImage =
    ImageExtension.extend({
      addAttributes() {
        const parentAttributes =
          this.parent ? this.parent() : {};

        return {
          ...parentAttributes,

          width: {
            default: null,

            parseHTML: element => {
              return (
                element.getAttribute('data-width') ||
                element.getAttribute('width') ||
                element.style.width ||
                null
              );
            },

            renderHTML: attributes => {
              const baseAttributes = {
                class: 'navi-editor-image'
              };

              if (!attributes.width) {
                return {
                  ...baseAttributes,
                  style: 'max-width: 100%; height: auto;'
                };
              }

              return {
                ...baseAttributes,
                'data-width': attributes.width,
                style: `width: ${attributes.width}; max-width: 100%; height: auto;`
              };
            }
          }
        };
      }
    });
} else {
  NaviImage = null;
}

    window.NaviTiptap = {
      initTiptapEditor,
      getEditor,
      getHtml,
      getText,
      setHtml,
      focus,
      run,
      insertImage,
      updateImageWidthBySrc
    };

    console.log('NaviTiptap loaded successfully.');

    return true;
  } catch (error) {
    console.warn(
      'NaviTiptap failed to load. Falling back to contenteditable.',
      error
    );

    window.NaviTiptap = null;

    setEngineStatus('Engine: fallback editor', 'engine-fallback');

    return false;
  }
})();

function initTiptapEditor({
  element,
  content = '<p></p>',
  onChange
} = {}) {
  if (!element) {
    console.warn('NaviTiptap: missing editor element.');
    setEngineStatus('Engine: fallback editor', 'engine-fallback');
    return null;
  }

  if (!Editor || !StarterKit) {
    console.warn('NaviTiptap: editor modules are not loaded.');
    setEngineStatus('Engine: fallback editor', 'engine-fallback');
    return null;
  }

  if (tiptapEditor) {
  tiptapEditor.destroy();
  tiptapEditor = null;
}

clearTiptapMountElement(element);

const extensions = [
  StarterKit
];

if (TextStyle) {
  extensions.push(TextStyle);
}
  
  if (InlineComment) {
  extensions.push(InlineComment);
}

if (FontFamily && TextStyle) {
  extensions.push(FontFamily);
}

if (FontSize) {
  extensions.push(FontSize);
}

if (Underline) {
  extensions.push(Underline);
}

if (Color) {
  extensions.push(Color);
}

if (Highlight) {
  extensions.push(
    Highlight.configure({
      multicolor: true
    })
  );
}

if (NaviImage) {
  extensions.push(
    NaviImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'navi-editor-image'
      }
    })
  );
}

if (TableKit) {
  extensions.push(
    TableKit.configure({
      table: {
        resizable: true
      }
    })
  );
}

tiptapEditor = new Editor({
  element,
  extensions,
  content: content || '<p></p>',

  onUpdate({ editor }) {
    if (suppressTiptapUpdate) {
      return;
    }

    if (window.NaviWriterIsLoadingDocument) {
      return;
    }

    if (typeof onChange === 'function') {
      onChange(
        editor.getHTML(),
        editor.getText()
      );
    }
  }
});

setTimeout(() => {
  removeTiptapGhostNodes(element);
}, 0);

setEngineStatus('Engine: Tiptap', 'engine-tiptap');

return tiptapEditor;
  
}

function getEditor() {
  return tiptapEditor;
}

function getHtml() {
  return tiptapEditor
    ? tiptapEditor.getHTML()
    : '';
}

function getText() {
  return tiptapEditor
    ? tiptapEditor.getText()
    : '';
}

function setHtml(html = '<p></p>') {
  if (!tiptapEditor) return;

  const nextHtml =
    html && String(html).trim()
      ? html
      : '<p></p>';

  suppressTiptapUpdate = true;

  try {
    try {
      tiptapEditor.commands.setContent(
        nextHtml,
        {
          emitUpdate: false
        }
      );
    } catch (error) {
      tiptapEditor.commands.setContent(
        nextHtml,
        false
      );
    }

    const mountElement = tiptapEditor.options.element;

    setTimeout(() => {
      removeTiptapGhostNodes(mountElement);
    }, 0);
  } finally {
    setTimeout(() => {
      suppressTiptapUpdate = false;
    }, 120);
  }
}

function focus() {
  if (!tiptapEditor) return;

  tiptapEditor.commands.focus();
}

function insertImage(src, alt = '') {
  if (!tiptapEditor || !src) return false;

  return tiptapEditor
    .chain()
    .focus()
    .setImage({
      src,
      alt,
      width: '75%'
    })
    .run();
}

function updateImageWidthBySrc(src, width = null) {
  if (!tiptapEditor || !src) return false;

  const { state } = tiptapEditor;

  let foundPos = null;

  state.doc.descendants((node, pos) => {
    if (
      node.type.name === 'image' &&
      node.attrs.src === src
    ) {
      foundPos = pos;
      return false;
    }

    return true;
  });

  if (foundPos === null) {
    return false;
  }

  return tiptapEditor
    .chain()
    .focus()
    .setNodeSelection(foundPos)
    .updateAttributes('image', {
      width
    })
    .run();
}

function run(command, value = null) {
  if (!tiptapEditor) return false;

  const chain =
    tiptapEditor
      .chain()
      .focus();

  if (command === 'bold') {
    return chain.toggleBold().run();
  }

  if (command === 'italic') {
    return chain.toggleItalic().run();
  }

  if (command === 'underline') {
    if (!tiptapEditor.commands.toggleUnderline) {
      console.warn('Underline unavailable: toggleUnderline command is missing.');
      return false;
    }

    return chain.toggleUnderline().run();
  }

  if (command === 'strikeThrough') {
    return chain.toggleStrike().run();
  }

  if (command === 'bulletList') {
    return chain.toggleBulletList().run();
  }

  if (command === 'orderedList') {
    return chain.toggleOrderedList().run();
  }

  if (command === 'blockquote') {
    return chain.toggleBlockquote().run();
  }

  if (command === 'horizontalRule') {
    return chain.setHorizontalRule().run();
  }

  if (command === 'undo') {
    return tiptapEditor.commands.undo();
  }
  
  if (command === 'inlineComment') {
  if (!value) return false;

  if (!tiptapEditor.commands.setInlineComment) {
    console.warn(
      'Inline comments unavailable: setInlineComment command is missing.'
    );
    return false;
  }

  return chain
    .setInlineComment(value)
    .run();
}

if (command === 'removeInlineComment') {
  if (!tiptapEditor.commands.unsetInlineComment) {
    return false;
  }

  return chain
    .unsetInlineComment()
    .run();
}

  if (command === 'redo') {
    return tiptapEditor.commands.redo();
  }

  if (command === 'paragraph') {
    return chain.setParagraph().run();
  }

  if (command === 'heading') {
    return chain
      .toggleHeading({
        level: Number(value) || 1
      })
      .run();
  }

  if (command === 'fontFamily') {
    if (!value) return false;

    if (!tiptapEditor.commands.setFontFamily) {
      console.warn(
        'Font family unavailable: setFontFamily command is missing.'
      );
      return false;
    }

    return chain
      .setFontFamily(value)
      .run();
  }

  if (command === 'fontSize') {
    if (!value) return false;

    if (!tiptapEditor.commands.setFontSize) {
      console.warn(
        'Font size unavailable: setFontSize command is missing.'
      );
      return false;
    }

    const legacySizeMap = {
      '1': '10px',
      '2': '12px',
      '3': '14px',
      '4': '18px',
      '5': '24px',
      '6': '32px',
      '7': '48px'
    };

    const raw =
      String(value || '').trim();

    const size =
      legacySizeMap[raw] ||
      (/^\d+$/.test(raw) ? `${raw}px` : raw);

    return chain
      .setFontSize(size)
      .run();
  }

  /*
    Tables.
    These commands come from Tiptap's table extension/TableKit.
  */
  if (command === 'insertTable') {
    const options =
      value && typeof value === 'object'
        ? value
        : {};

    if (!tiptapEditor.commands.insertTable) {
      console.warn('Table unavailable: insertTable command is missing.');
      return false;
    }

    return chain
      .insertTable({
        rows: Number(options.rows) || 3,
        cols: Number(options.cols) || 3,
        withHeaderRow: options.withHeaderRow !== false
      })
      .run();
  }

  if (command === 'addRowBefore') {
    if (!tiptapEditor.commands.addRowBefore) return false;
    return chain.addRowBefore().run();
  }

  if (command === 'addRowAfter') {
    if (!tiptapEditor.commands.addRowAfter) return false;
    return chain.addRowAfter().run();
  }

  if (command === 'deleteRow') {
    if (!tiptapEditor.commands.deleteRow) return false;
    return chain.deleteRow().run();
  }

  if (command === 'addColumnBefore') {
    if (!tiptapEditor.commands.addColumnBefore) return false;
    return chain.addColumnBefore().run();
  }

  if (command === 'addColumnAfter') {
    if (!tiptapEditor.commands.addColumnAfter) return false;
    return chain.addColumnAfter().run();
  }

  if (command === 'deleteColumn') {
    if (!tiptapEditor.commands.deleteColumn) return false;
    return chain.deleteColumn().run();
  }

  if (command === 'deleteTable') {
    if (!tiptapEditor.commands.deleteTable) return false;
    return chain.deleteTable().run();
  }

  if (command === 'mergeCells') {
    if (!tiptapEditor.commands.mergeCells) return false;
    return chain.mergeCells().run();
  }

  if (command === 'splitCell') {
    if (!tiptapEditor.commands.splitCell) return false;
    return chain.splitCell().run();
  }

  if (command === 'textColor') {
    if (!value) return false;

    if (!tiptapEditor.schema.marks.textStyle) {
      console.warn('Text color unavailable: textStyle mark is not registered.');
      return false;
    }

    if (!tiptapEditor.commands.setColor) {
      console.warn('Text color unavailable: setColor command is missing.');
      return false;
    }

    return chain
      .setColor(value)
      .run();
  }

  if (command === 'highlightColor') {
    if (!value) return false;

    if (!tiptapEditor.commands.setHighlight) {
      console.warn('Highlight unavailable: setHighlight command is missing.');
      return false;
    }

    return chain
      .setHighlight({
        color: value
      })
      .run();
  }

  if (command === 'removeFormat') {
    return chain
      .unsetAllMarks()
      .clearNodes()
      .run();
  }

  return false;
}