// js/app.js
// NaviWriter app controller
// Wires together storage, editor, themes, autosave, and document UI.
// globals are up here hobo

let currentDocumentId = null;
let showResolvedInlineComments = false;
let commentsDrawerDragging = false;
let projectCommentsDragging = false;

const LAYOUT_MODE_KEY =
  'naviwriter-layout-mode';

let currentLayoutPreference =
  'auto';

let currentResolvedLayoutMode =
  'desktop';

let projectCommentsDragStart = {
  x: 0,
  y: 0
};

let projectCommentsStart = {
  x: 0,
  y: 0
};
let commentsDrawerDragStart = {
  x: 0,
  y: 0
};

let commentsDrawerStart = {
  x: 0,
  y: 0
};

const COMMENTS_DRAWER_POSITION_KEY =
  'naviwriter-comments-drawer-position';
let showOtherCustomMetadataFields = false;
let localGraphSelectedNodeId = null;
let localGraphMode = 'local';
let isBoardMinimapDragging = false;
let boardMinimapScale = 1;
let isBoardMinimapPanelDragging = false;


let boardMinimapPanelDragStart = {
  x: 0,
  y: 0
};

let boardMinimapPanelStart = {
  x: 0,
  y: 0
};

const BOARD_MINIMAP_POSITION_KEY =
  'naviwriter-board-minimap-position';
let localGraphNodeDragStart = {
  x: 0,
  y: 0
};

let localGraphSuppressNextNodeClick = false;
let localGraphData = {
  nodes: [],
  edges: []
};

let localGraphPositions = {};
let localGraphZoom = 1;
let localGraphPan = {
  x: 0,
  y: 0
};

let localGraphDragNodeId = null;
let localGraphDragOffset = {
  x: 0,
  y: 0
};

let localGraphIsPanning = false;
let localGraphPanStart = {
  x: 0,
  y: 0
};
let collectionsCache = [];
let pendingCollectionPickerSelectedIds = new Set();
let localGraphMinimapScale = 1;
let isLocalGraphMinimapDragging = false;
let editingSourceId = null;
let splitPaneDocId = null;
let splitOwnerDocumentId = null;
let splitPaneEditable = false;
let splitPaneAutosaveTimer = null;
const SPLIT_PANE_AUTOSAVE_DELAY = 700;
let documentsCache = [];
let activeFolderFilter = null;
let showFolderParentContext = false;
let activeCollectionId = null;
let autosaveTimer = null;
let currentProjectFileHandle = null;
let currentProjectFileName = '';
let projectFileAutosaveTimer = null;
let pendingCoverDocId = null;
let editingBoardLinkId = null;
let openDocumentRequestId = 0;
let pendingMessageResolve = null;
let pendingMatterPresetResolve = null;
let pendingChoiceResolve = null;
let pendingBoardLinkResolve = null;
let pendingBoardConnectionResolve = null;
let pendingTextInputResolve = null;
let pendingConfirmResolve = null;
let pendingMatterPresetKind = '';
let editingBoardPersonId = null;
const PROJECT_FILE_AUTOSAVE_KEY =
  'naviwriter-project-file-autosave-minutes';
let isSaving = false;
let sessionStartWords = 0;
let currentGoal = 0;
let collapsedDocIds = new Set();
let pendingPdfParentId = null;
let isLoadingDocument = false;
let currentBoardData = {
  items: [],
  connectors: [],
  canvas: {
    width: 5000,
    height: 3500
  }
};
let activeBoardItemId = null;
let selectedBoardItemIds = new Set();
let boardConnectMode = false;
let boardConnectStartId = null;
let boardZoom = 1;
let boardUndoStack = [];
let boardRedoStack = [];
const BOARD_UNDO_LIMIT = 50;
const AUTOSAVE_DELAY = 900;
const els = {};
const COLLECTIONS_KEY = 'naviwriter-collections';
const RELATIONSHIP_ENTITY_TYPES = [
  'document',
  'folder',
  'collection',
  'source',

  // future
  'tag',
  'customField',
  'boardItem',
  'relationshipType'
];

const DEFAULT_RELATIONSHIP_TYPES = [
  'related',
  'references',
  'supports',
  'foreshadows',
  'continues',
  'contradicts',
  'contains lore for'
];

const RELATIONSHIP_TYPES_KEY = 'naviwriter-relationship-types';

const RELATIONSHIPS_KEY = 'naviwriter-relationships';

const CUSTOM_METADATA_FIELDS_KEY =
  'naviwriter-custom-metadata-fields';

const OUTLINER_CUSTOM_METADATA_COLUMNS_KEY =
  'naviwriter-outliner-custom-metadata-columns';

const CUSTOM_METADATA_FIELD_TYPES = [
  'text',
  'longText',
  'dropdown',
  'checkbox',
  'number',
  'date'
];

let relationshipsCache = [];

// globals end here boi. please for the love of god dont put globals below this unless absloutley necessary

function $(id) {
  return document.getElementById(id);
}

function syncBoardModeBarState() {
  if (!els.boardModeBar) {
    return;
  }

  const boardIsActive =
    els.boardSurface &&
    !els.boardSurface.classList.contains('hidden');

  els.boardModeBar.classList.toggle(
    'is-board-mode',
    boardIsActive
  );
}



async function handleNewManuscript() {
  const title = await openTextInputModal({
    title: 'New Manuscript',
    message: 'Name this manuscript project.',
    label: 'Manuscript title',
    defaultValue: 'Untitled Manuscript',
    placeholder: 'Untitled Manuscript',
    submitText: 'Create Manuscript'
  });

  if (!title || !title.trim()) return;

  const cleanTitle = title.trim();

  const manuscript =
    NaviStorage.createBlankDocument(cleanTitle);

  manuscript.docType = 'manuscript';
  manuscript.content =
    `<h1>${escapeHtml(cleanTitle)}</h1>` +
    '<p>Manuscript overview...</p>';
  manuscript.plainText =
    `${cleanTitle} Manuscript overview...`;
  manuscript.wordCount =
    NaviEditor.countWords(manuscript.plainText);
  manuscript.charCount =
    manuscript.plainText.length;

  const savedManuscript =
    await NaviStorage.saveDocument(manuscript);

  const chapter =
    NaviStorage.createBlankDocument('Chapter 1');

  chapter.parentId = savedManuscript.id;
  chapter.docType = 'chapter';
  chapter.content = '<h1>Chapter 1</h1><p></p>';
  chapter.plainText = 'Chapter 1';
  chapter.wordCount = NaviEditor.countWords(chapter.plainText);
  chapter.charCount = chapter.plainText.length;

  await NaviStorage.saveDocument(chapter);

  await loadDocuments();
  await openDocument(savedManuscript.id);
}

function cacheElements() {
  els.newDocBtn = $('newDocBtn');
  els.duplicateDocBtn = $('duplicateDocBtn');
  els.renameDocBtn = $('renameDocBtn');
  els.deleteDocBtn = $('deleteDocBtn');
  els.importBtn = $('importBtn');
  els.exportSelect = $('exportSelect');
els.focusBtn = $('focusBtn');
els.exitFocusBtn = $('exitFocusBtn');

  els.docSearch = $('docSearch');
  els.documentList = $('documentList');
  els.docCount = $('docCount');

  els.docTitle = $('docTitle');
  els.editor = $('editor');

  els.importFile = $('importFile');
  els.findInput = $('findInput');
  els.replaceInput = $('replaceInput');
  els.findNextBtn = $('findNextBtn');
  els.replaceBtn = $('replaceBtn');
  els.replaceAllBtn = $('replaceAllBtn');

  els.outlineList = $('outlineList');

  els.goalInput = $('goalInput');
  els.saveGoalBtn = $('saveGoalBtn');
  els.goalProgress = $('goalProgress');
  els.goalBarFill = $('goalBarFill');

  els.statWords = $('statWords');
  els.statChars = $('statChars');
  els.statParagraphs = $('statParagraphs');
  els.statHeadings = $('statHeadings');
  els.statReadingTime = $('statReadingTime');
  els.statSessionWords = $('statSessionWords');

  els.folderInput = $('folderInput');
  els.tagsInput = $('tagsInput');
  els.saveMetaBtn = $('saveMetaBtn');
  
  els.applyStatusToSubdocsBtn = $('applyStatusToSubdocsBtn');
  
  els.docStatusSelect = $('docStatusSelect');
els.docPovInput = $('docPovInput');
els.docLocationInput = $('docLocationInput');
els.docTimelineInput = $('docTimelineInput');
els.docCharactersInput = $('docCharactersInput');
els.docSummaryInput = $('docSummaryInput');

  els.recentDocsList = $('recentDocsList');

  els.topWordsList = $('topWordsList');
  els.topPhrasesList = $('topPhrasesList');
  els.headingCountsList = $('headingCountsList');

  els.longGoalWordsInput = $('longGoalWordsInput');
  els.longGoalDateInput = $('longGoalDateInput');
  els.saveLongGoalBtn = $('saveLongGoalBtn');
  els.longGoalOutput = $('longGoalOutput');

  els.dailyGoalOutput = $('dailyGoalOutput');
els.dailyGoalBarFill = $('dailyGoalBarFill');

  els.insertEndnoteBtn = $('insertEndnoteBtn');
  els.splitDocBtn = $('splitDocBtn');
  els.toggleInspectorSectionsBtn = $('toggleInspectorSectionsBtn');
  
  els.exportProjectBackupBtn = $('exportProjectBackupBtn');
els.importProjectBackupBtn = $('importProjectBackupBtn');
els.projectBackupInput = $('projectBackupInput');
  
  els.openProjectFileBtn = $('openProjectFileBtn');
els.saveProjectAsBtn = $('saveProjectAsBtn');
els.saveProjectFileBtn = $('saveProjectFileBtn');
els.projectAutosaveSelect = $('projectAutosaveSelect');
  
  els.takeSnapshotBtn = $('takeSnapshotBtn');
els.snapshotHistoryBtn = $('snapshotHistoryBtn');
els.snapshotModal = $('snapshotModal');
els.closeSnapshotModalBtn = $('closeSnapshotModalBtn');
els.snapshotList = $('snapshotList');

  els.importPdfBtn = $('importPdfBtn');
  els.pdfInput = $('pdfInput');

els.newSubDocBtn = $('newSubDocBtn');
  
  els.openSidebarDrawerBtn =
  $('openSidebarDrawerBtn');

els.openInspectorDrawerBtn =
  $('openInspectorDrawerBtn');

els.closeSidebarDrawerBtn =
  $('closeSidebarDrawerBtn');

els.closeInspectorDrawerBtn =
  $('closeInspectorDrawerBtn');

els.responsiveOverlay =
  $('responsiveOverlay');

  els.newManuscriptBtn = $('newManuscriptBtn');

  els.analysisScopeSelect = $('analysisScopeSelect');

els.findPanel = $('findPanel');
els.closeFindPanelBtn = $('closeFindPanelBtn');
els.floatingFindInput = $('floatingFindInput');
els.floatingReplaceInput = $('floatingReplaceInput');
els.floatingFindBtn = $('floatingFindBtn');
els.floatingReplaceSelectedBtn = $('floatingReplaceSelectedBtn');
els.floatingReplaceAllBtn = $('floatingReplaceAllBtn');
els.findResultsSummary = $('findResultsSummary');
  els.findResultsList = $('findResultsList');
  els.floatingFindScopeSelect = $('floatingFindScopeSelect');

  els.subdocTypeModal = $('subdocTypeModal');
  els.closeSubdocModalBtn = $('closeSubdocModalBtn');

els.pdfSubdocModal = $('pdfSubdocModal');
els.closePdfSubdocModalBtn = $('closePdfSubdocModalBtn');
els.pdfUploadNewBtn = $('pdfUploadNewBtn');
els.pdfBlankNoteBtn = $('pdfBlankNoteBtn');
els.existingPdfList = $('existingPdfList');

els.boardModeBar = $('boardModeBar');
els.writeModeBtn = $('writeModeBtn');
els.boardModeBtn = $('boardModeBtn');
els.boardSurface = $('boardSurface');
els.addBoardNoteBtn = $('addBoardNoteBtn');
els.addBoardImageBtn = $('addBoardImageBtn');
els.addBoardLinkBtn = $('addBoardLinkBtn');
  els.boardImageInput = $('boardImageInput');

els.addBoardPersonBtn = $('addBoardPersonBtn');
  els.exportBoardBtn = $('exportBoardBtn');

els.connectBoardItemsBtn = $('connectBoardItemsBtn');
els.zoomOutBoardBtn = $('zoomOutBoardBtn');
els.zoomInBoardBtn = $('zoomInBoardBtn');
  els.boardZoomLabel = $('boardZoomLabel');

els.colorBoardItemBtn = $('colorBoardItemBtn');

  els.undoBoardBtn = $('undoBoardBtn');

els.redoBoardBtn = $('redoBoardBtn');
  
  els.projectFileStatus = $('projectFileStatus');
  
  els.compileIncludeFrontMatter = $('compileIncludeFrontMatter');
els.compileIncludeBackMatter = $('compileIncludeBackMatter');
  els.compileExportBtn = $('compileExportBtn');
els.compileModal = $('compileModal');
els.closeCompileModalBtn = $('closeCompileModalBtn');
els.cancelCompileBtn = $('cancelCompileBtn');
els.runCompileBtn = $('runCompileBtn');
els.compileFormatSelect = $('compileFormatSelect');
els.compilePreviewList = $('compilePreviewList');
els.compileIncludeTitles = $('compileIncludeTitles');
els.compilePageBreaks = $('compilePageBreaks');
els.compileIncludeNotes = $('compileIncludeNotes');
els.compileIncludeResearch = $('compileIncludeResearch');
els.compileIncludePdf = $('compileIncludePdf');
  els.coverImageInput = $('coverImageInput');
  
  els.compileIncludeCover = $('compileIncludeCover');
  
  els.projectTitleInput = $('projectTitleInput');
els.projectSubtitleInput = $('projectSubtitleInput');
els.projectAuthorInput = $('projectAuthorInput');
els.saveProjectMetaBtn = $('saveProjectMetaBtn');

els.compileIncludeCover = $('compileIncludeCover');
els.compileIncludeBodyMatter = $('compileIncludeBodyMatter');
  
  els.matterPresetModal = $('matterPresetModal');
els.matterPresetTitle = $('matterPresetTitle');
els.matterPresetSubtitle = $('matterPresetSubtitle');
els.matterPresetGrid = $('matterPresetGrid');
els.closeMatterPresetModalBtn = $('closeMatterPresetModalBtn');
  
  els.textInputModal = $('textInputModal');
els.textInputModalTitle = $('textInputModalTitle');
els.textInputModalMessage = $('textInputModalMessage');
els.textInputModalLabel = $('textInputModalLabel');
els.textInputModalField = $('textInputModalField');
els.closeTextInputModalBtn = $('closeTextInputModalBtn');
els.cancelTextInputModalBtn = $('cancelTextInputModalBtn');
els.submitTextInputModalBtn = $('submitTextInputModalBtn');

els.confirmModal = $('confirmModal');
els.confirmModalTitle = $('confirmModalTitle');
els.confirmModalMessage = $('confirmModalMessage');
els.closeConfirmModalBtn = $('closeConfirmModalBtn');
els.cancelConfirmModalBtn = $('cancelConfirmModalBtn');
els.submitConfirmModalBtn = $('submitConfirmModalBtn');
  
  els.printPageSizeSelect = $('printPageSizeSelect');
els.printStyleSelect = $('printStyleSelect');
els.printFontSelect = $('printFontSelect');
els.printMarginsSelect = $('printMarginsSelect');
els.printAutoTitlePage = $('printAutoTitlePage');
  
  els.messageModal = $('messageModal');
els.messageModalTitle = $('messageModalTitle');
els.messageModalText = $('messageModalText');
els.closeMessageModalBtn = $('closeMessageModalBtn');
els.okMessageModalBtn = $('okMessageModalBtn');
  
  els.boardPersonModal = $('boardPersonModal');
els.closeBoardPersonModalBtn = $('closeBoardPersonModalBtn');
els.cancelBoardPersonModalBtn = $('cancelBoardPersonModalBtn');
els.submitBoardPersonModalBtn = $('submitBoardPersonModalBtn');
els.boardPersonNameInput = $('boardPersonNameInput');
els.boardPersonRoleInput = $('boardPersonRoleInput');
els.boardPersonNotesInput = $('boardPersonNotesInput');
  
  els.choiceModal = $('choiceModal');
els.choiceModalTitle = $('choiceModalTitle');
els.choiceModalSubtitle = $('choiceModalSubtitle');
els.choiceModalGrid = $('choiceModalGrid');
els.closeChoiceModalBtn = $('closeChoiceModalBtn');

els.boardLinkModal = $('boardLinkModal');
els.closeBoardLinkModalBtn = $('closeBoardLinkModalBtn');
els.cancelBoardLinkModalBtn = $('cancelBoardLinkModalBtn');
els.submitBoardLinkModalBtn = $('submitBoardLinkModalBtn');
els.boardLinkTitleInput = $('boardLinkTitleInput');
els.boardLinkUrlInput = $('boardLinkUrlInput');

els.boardConnectionModal = $('boardConnectionModal');
els.closeBoardConnectionModalBtn = $('closeBoardConnectionModalBtn');
els.cancelBoardConnectionModalBtn = $('cancelBoardConnectionModalBtn');
els.submitBoardConnectionModalBtn = $('submitBoardConnectionModalBtn');
els.boardConnectionLabelInput = $('boardConnectionLabelInput');
els.boardConnectionTypeSelect = $('boardConnectionTypeSelect');
  
  els.bookThemeSelect = $('bookThemeSelect');

els.compileProfileSelect = $('compileProfileSelect');
els.applyCompileProfileBtn = $('applyCompileProfileBtn');
els.saveCompileProfileBtn = $('saveCompileProfileBtn');
els.deleteCompileProfileBtn = $('deleteCompileProfileBtn');
  
  els.duplicateBoardItemBtn = $('duplicateBoardItemBtn');
els.bringBoardItemFrontBtn = $('bringBoardItemFrontBtn');
els.sendBoardItemBackBtn = $('sendBoardItemBackBtn');
els.familyConnectorBtn = $('familyConnectorBtn');
els.resetBoardZoomBtn = $('resetBoardZoomBtn');
  
  els.decreaseBoardFontBtn = $('decreaseBoardFontBtn');
els.increaseBoardFontBtn = $('increaseBoardFontBtn');
els.resetBoardFontBtn = $('resetBoardFontBtn');
  
  els.openOutlinerBtn = $('openOutlinerBtn');
els.outlinerModal = $('outlinerModal');
els.closeOutlinerModalBtn = $('closeOutlinerModalBtn');
els.outlinerScopeSelect = $('outlinerScopeSelect');
els.outlinerSearchInput = $('outlinerSearchInput');
els.refreshOutlinerBtn = $('refreshOutlinerBtn');
els.outlinerTableBody = $('outlinerTableBody');
  
  els.outlinerStatusFilterSelect = $('outlinerStatusFilterSelect');
els.outlinerTypeFilterSelect = $('outlinerTypeFilterSelect');
els.outlinerFolderFilterSelect = $('outlinerFolderFilterSelect');
els.outlinerSortSelect = $('outlinerSortSelect');
  
  els.workspace = document.querySelector('.workspace');

els.openSplitEditorBtn = $('openSplitEditorBtn');
els.splitPane = $('splitPane');
els.closeSplitEditorBtn = $('closeSplitEditorBtn');
els.splitDocSelect = $('splitDocSelect');
els.splitDocMeta = $('splitDocMeta');
els.splitDocContent = $('splitDocContent');
els.openSplitDocAsMainBtn = $('openSplitDocAsMainBtn');
  
  els.editSplitPaneBtn =
  $('editSplitPaneBtn');

els.saveSplitPaneBtn =
  $('saveSplitPaneBtn');
  
  els.splitResizeHandle = $('splitResizeHandle');
  
  els.sourcesModeBtn = $('sourcesModeBtn');
els.sourcesPanel = $('sourcesPanel');
els.addSourceBtn = $('addSourceBtn');
els.sourcesList = $('sourcesList');

els.sourceModal = $('sourceModal');
els.sourceModalTitle = $('sourceModalTitle');
els.closeSourceModalBtn = $('closeSourceModalBtn');
els.cancelSourceModalBtn = $('cancelSourceModalBtn');
els.submitSourceModalBtn = $('submitSourceModalBtn');

els.sourceTitleInput = $('sourceTitleInput');
els.sourceUrlInput = $('sourceUrlInput');
els.sourceAuthorInput = $('sourceAuthorInput');
els.sourceDateInput = $('sourceDateInput');
els.sourceTagsInput = $('sourceTagsInput');
els.sourceNotesInput = $('sourceNotesInput');
  
  els.openCollectionsBtn = $('openCollectionsBtn');
els.collectionsModal = $('collectionsModal');
els.closeCollectionsModalBtn = $('closeCollectionsModalBtn');
els.newCollectionBtn = $('newCollectionBtn');
els.addCurrentDocToCollectionBtn = $('addCurrentDocToCollectionBtn');
els.collectionsList = $('collectionsList');
els.collectionDetailTitle = $('collectionDetailTitle');
els.collectionDetailMeta = $('collectionDetailMeta');
els.collectionDocsList = $('collectionDocsList');
els.renameCollectionBtn = $('renameCollectionBtn');
els.deleteCollectionBtn = $('deleteCollectionBtn');
  
  els.addDocsToCollectionBtn = $('addDocsToCollectionBtn');

els.collectionDocPickerModal = $('collectionDocPickerModal');
els.collectionPickerSubtitle = $('collectionPickerSubtitle');
els.closeCollectionDocPickerBtn = $('closeCollectionDocPickerBtn');
els.cancelCollectionDocPickerBtn = $('cancelCollectionDocPickerBtn');
els.submitCollectionDocPickerBtn = $('submitCollectionDocPickerBtn');
els.collectionDocPickerSearch = $('collectionDocPickerSearch');
els.collectionDocPickerTypeFilter = $('collectionDocPickerTypeFilter');
els.collectionDocPickerList = $('collectionDocPickerList');
  
  els.relationshipOutgoing = $('relationshipOutgoing');

els.relationshipBacklinks = $('relationshipBacklinks');
  
  els.createRelationshipBtn = $('createRelationshipBtn');

els.relationshipModal = $('relationshipModal');
els.closeRelationshipModalBtn = $('closeRelationshipModalBtn');
els.cancelRelationshipModalBtn = $('cancelRelationshipModalBtn');
els.submitRelationshipModalBtn = $('submitRelationshipModalBtn');

els.relationshipTargetTypeSelect = $('relationshipTargetTypeSelect');
els.relationshipTargetSelect = $('relationshipTargetSelect');
els.relationshipTypeSelect = $('relationshipTypeSelect');
els.relationshipStrengthSelect = $('relationshipStrengthSelect');
els.relationshipNoteInput = $('relationshipNoteInput');
  
  els.outlinerViewSelect = $('outlinerViewSelect');
  
  els.manageRelationshipTypesBtn =
  $('manageRelationshipTypesBtn');

els.relationshipTypesModal =
  $('relationshipTypesModal');

els.closeRelationshipTypesModalBtn =
  $('closeRelationshipTypesModalBtn');

els.cancelRelationshipTypesModalBtn =
  $('cancelRelationshipTypesModalBtn');

els.relationshipTypesList =
  $('relationshipTypesList');

els.relationshipTypeNameInput =
  $('relationshipTypeNameInput');

els.addRelationshipTypeBtn =
  $('addRelationshipTypeBtn');
  
  els.outlinerShowExplicitRelationships =
  $('outlinerShowExplicitRelationships');

els.outlinerShowCollectionRelationships =
  $('outlinerShowCollectionRelationships');

els.outlinerShowFolderRelationships =
  $('outlinerShowFolderRelationships');
  
  els.outlinerShowSourceRelationships =
  $('outlinerShowSourceRelationships');

els.outlinerShowTagRelationships =
  $('outlinerShowTagRelationships');
  
  els.openLocalGraphBtn =
  $('openLocalGraphBtn');

els.localGraphModal =
  $('localGraphModal');

els.closeLocalGraphModalBtn =
  $('closeLocalGraphModalBtn');

els.localGraphSubtitle =
  $('localGraphSubtitle');

els.localGraphSurface =
  $('localGraphSurface');

els.localGraphViewport =
  $('localGraphViewport');

els.localGraphEdges =
  $('localGraphEdges');

els.localGraphNodes =
  $('localGraphNodes');

els.localGraphZoomOutBtn =
  $('localGraphZoomOutBtn');

els.localGraphZoomInBtn =
  $('localGraphZoomInBtn');

els.localGraphZoomLabel =
  $('localGraphZoomLabel');

els.localGraphResetBtn =
  $('localGraphResetBtn');
  
  els.localGraphShowExplicit =
  $('localGraphShowExplicit');

els.localGraphShowCollections =
  $('localGraphShowCollections');

els.localGraphShowFolders =
  $('localGraphShowFolders');

els.localGraphShowSources =
  $('localGraphShowSources');

els.localGraphShowTags =
  $('localGraphShowTags');
  
  els.localGraphDetailsPanel =
  $('localGraphDetailsPanel');

els.localGraphDetailsTitle =
  $('localGraphDetailsTitle');

els.localGraphDetailsMeta =
  $('localGraphDetailsMeta');

els.localGraphDetailsBody =
  $('localGraphDetailsBody');

els.closeLocalGraphDetailsBtn =
  $('closeLocalGraphDetailsBtn');

els.centerLocalGraphNodeBtn =
  $('centerLocalGraphNodeBtn');

els.openLocalGraphNodeBtn =
  $('openLocalGraphNodeBtn');
  
  els.openRelationshipDashboardBtn =
  $('openRelationshipDashboardBtn');

els.relationshipDashboardModal =
  $('relationshipDashboardModal');

els.closeRelationshipDashboardBtn =
  $('closeRelationshipDashboardBtn');

els.refreshRelationshipDashboardBtn =
  $('refreshRelationshipDashboardBtn');

els.openOutlinerFromDashboardBtn =
  $('openOutlinerFromDashboardBtn');

els.relationshipDashboardSubtitle =
  $('relationshipDashboardSubtitle');

els.relationshipDashboardBody =
  $('relationshipDashboardBody');
  
  els.openGlobalGraphBtn =
  $('openGlobalGraphBtn');
  
  els.localGraphTitle =
  $('localGraphTitle');
  
  els.showBoardMinimapBtn =
  $('showBoardMinimapBtn');

els.boardMinimap =
  $('boardMinimap');

els.toggleBoardMinimapBtn =
  $('toggleBoardMinimapBtn');

els.boardMinimapBody =
  $('boardMinimapBody');

els.boardMinimapWorld =
  $('boardMinimapWorld');

els.boardMinimapViewport =
  $('boardMinimapViewport');
  
  els.localGraphMinimap =
  $('localGraphMinimap');

els.toggleLocalGraphMinimapBtn =
  $('toggleLocalGraphMinimapBtn');

els.localGraphMinimapBody =
  $('localGraphMinimapBody');

els.localGraphMinimapWorld =
  $('localGraphMinimapWorld');

els.localGraphMinimapViewport =
  $('localGraphMinimapViewport');
  
  els.documentMapPanel =
  $('documentMapPanel');

els.documentMapList =
  $('documentMapList');

els.refreshDocumentMapBtn =
  $('refreshDocumentMapBtn');
  
  els.manageCustomMetadataFieldsBtn =
  $('manageCustomMetadataFieldsBtn');

els.customMetadataFieldsModal =
  $('customMetadataFieldsModal');

els.closeCustomMetadataFieldsModalBtn =
  $('closeCustomMetadataFieldsModalBtn');

els.customMetadataFieldNameInput =
  $('customMetadataFieldNameInput');

els.customMetadataFieldTypeSelect =
  $('customMetadataFieldTypeSelect');

els.customMetadataOptionsWrap =
  $('customMetadataOptionsWrap');

els.customMetadataFieldOptionsInput =
  $('customMetadataFieldOptionsInput');

els.addCustomMetadataFieldBtn =
  $('addCustomMetadataFieldBtn');

els.customMetadataFieldsList =
  $('customMetadataFieldsList');

els.customMetadataFieldsCount =
  $('customMetadataFieldsCount');
  
  els.manageCustomMetadataFieldsInlineBtn =
  $('manageCustomMetadataFieldsInlineBtn');

els.customMetadataValuesList =
  $('customMetadataValuesList');
  
  els.manageOutlinerCustomColumnsBtn =
  $('manageOutlinerCustomColumnsBtn');

els.outlinerCustomColumnsModal =
  $('outlinerCustomColumnsModal');

els.closeOutlinerCustomColumnsBtn =
  $('closeOutlinerCustomColumnsBtn');

els.outlinerCustomColumnsList =
  $('outlinerCustomColumnsList');
  
  els.addInlineCommentBtn =
  $('addInlineCommentBtn');

els.inlineCommentsSummary =
  $('inlineCommentsSummary');

els.openCommentsDrawerBtn =
  $('openCommentsDrawerBtn');

els.commentsDrawer =
  $('commentsDrawer');

els.commentsDrawerHead =
  $('commentsDrawerHead');

els.commentsDrawerSubtitle =
  $('commentsDrawerSubtitle');

els.commentsDrawerList =
  $('commentsDrawerList');

els.closeCommentsDrawerBtn =
  $('closeCommentsDrawerBtn');

els.toggleResolvedCommentsBtn =
  $('toggleResolvedCommentsBtn');
  
  els.toggleResolvedCommentsBtn =
  $('toggleResolvedCommentsBtn');
  
  els.renameSplitPaneDocBtn =
  $('renameSplitPaneDocBtn');
  
  els.openProjectCommentsBtn =
  $('openProjectCommentsBtn');

els.projectCommentsPanel =
  $('projectCommentsPanel');

els.projectCommentsSummary =
  $('projectCommentsSummary');

els.projectCommentsList =
  $('projectCommentsList');

els.closeProjectCommentsBtn =
  $('closeProjectCommentsBtn');
  
  els.projectCommentsPanelHead =
  $('projectCommentsPanelHead');
  
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
}

async function renderRelationshipPanel(
  docId
) {

  if (!docId) {
    return;
  }

  await renderOutgoingRelationships(
    docId
  );

  await renderBacklinks(
    docId
  );

}

function normalizeCustomMetadataFieldType(type = 'text') {
  const cleanType =
    String(type || 'text').trim();

  return CUSTOM_METADATA_FIELD_TYPES.includes(cleanType)
    ? cleanType
    : 'text';
}

function normalizeCustomMetadataFieldName(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 64);
}

function parseCustomMetadataOptions(value = '') {
  return String(value || '')
    .split('\n')
    .map(option => {
      return option.trim();
    })
    .filter(Boolean)
    .filter((option, index, list) => {
      return list.indexOf(option) === index;
    })
    .slice(0, 60);
}

function getCustomMetadataFieldTypeLabel(type = 'text') {
  if (type === 'text') return 'Text';
  if (type === 'longText') return 'Long Text';
  if (type === 'dropdown') return 'Dropdown';
  if (type === 'checkbox') return 'Checkbox';
  if (type === 'number') return 'Number';
  if (type === 'date') return 'Date';

  return 'Text';
}

function loadCommentsDrawerPosition() {
  try {
    const raw =
      localStorage.getItem(
        COMMENTS_DRAWER_POSITION_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function saveCommentsDrawerPosition() {
  if (!els.commentsDrawer) {
    return;
  }

  try {
    localStorage.setItem(
      COMMENTS_DRAWER_POSITION_KEY,
      JSON.stringify({
        x: Number.parseFloat(
          els.commentsDrawer.style.left || '0'
        ),
        y: Number.parseFloat(
          els.commentsDrawer.style.top || '0'
        )
      })
    );
  } catch {}
}

function clampCommentsDrawerPosition(x, y) {
  if (!els.commentsDrawer) {
    return {
      x,
      y
    };
  }

  const width =
    els.commentsDrawer.offsetWidth || 380;

  const height =
    els.commentsDrawer.offsetHeight || 520;

  return {
    x:
      Math.max(
        8,
        Math.min(
          x,
          window.innerWidth - width - 8
        )
      ),

    y:
      Math.max(
        8,
        Math.min(
          y,
          window.innerHeight - height - 8
        )
      )
  };
}

function placeCommentsDrawerDefaultIfNeeded() {
  if (!els.commentsDrawer) {
    return;
  }

  const saved =
    loadCommentsDrawerPosition();

  if (saved) {
    const pos =
      clampCommentsDrawerPosition(
        Number(saved.x || 0),
        Number(saved.y || 0)
      );

    els.commentsDrawer.style.left =
      `${pos.x}px`;

    els.commentsDrawer.style.top =
      `${pos.y}px`;

    return;
  }

  const width =
    els.commentsDrawer.offsetWidth || 380;

  const pos =
    clampCommentsDrawerPosition(
      window.innerWidth - width - 22,
      86
    );

  els.commentsDrawer.style.left =
    `${pos.x}px`;

  els.commentsDrawer.style.top =
    `${pos.y}px`;
}

function getInlineCommentCounts(comments = []) {
  const open =
    comments.filter(comment => {
      return !comment.resolved;
    }).length;

  const resolved =
    comments.filter(comment => {
      return comment.resolved;
    }).length;

  return {
    open,
    resolved,
    total:
      comments.length
  };
}

function getAllProjectInlineComments() {
  return documentsCache.flatMap(doc => {
    const comments =
      Array.isArray(doc.inlineComments)
        ? doc.inlineComments
        : [];

    return comments.map(comment => ({
      ...comment,
      documentId: doc.id,
      documentTitle:
        doc.title ||
        'Untitled Document'
    }));
  });
}

function renderProjectCommentsPanel() {
  if (
    !els.projectCommentsList
  ) {
    return;
  }

  const comments =
    getAllProjectInlineComments();

  const open =
    comments.filter(
      comment => !comment.resolved
    );

  const resolved =
    comments.filter(
      comment => comment.resolved
    );

  els.projectCommentsSummary.textContent =
    `${open.length} open · ${resolved.length} resolved`;

  if (!comments.length) {
    els.projectCommentsList.innerHTML =
      '<div class="empty-note">No comments yet.</div>';
    return;
  }

  const sorted =
    comments
      .slice()
      .sort((a, b) => {
        if (a.resolved !== b.resolved) {
          return a.resolved ? 1 : -1;
        }

        return (
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
        );
      });

  els.projectCommentsList.innerHTML = '';

  sorted.forEach(comment => {
    const card =
      document.createElement('article');

    card.className =
      'project-comment-card';

    card.innerHTML = `
      <div class="project-comment-doc">
        ${escapeHtml(
          comment.documentTitle
        )}
      </div>

      <div class="project-comment-quote">
        "${escapeHtml(
          comment.quote || ''
        )}"
      </div>

      <div class="project-comment-note">
        ${escapeHtml(
          comment.note || ''
        )}
      </div>

      <div class="project-comment-actions">
        <button
          data-project-comment-jump="${escapeHtml(comment.id)}"
          data-project-comment-doc="${escapeHtml(comment.documentId)}"
        >
          Jump
        </button>
      </div>
    `;

    card
      .querySelector(
        '[data-project-comment-jump]'
      )
      ?.addEventListener(
        'click',
        async event => {
          const button =
            event.currentTarget;

          await openDocument(
            button.dataset.projectCommentDoc
          );

          setTimeout(() => {
            jumpToInlineComment(
              button.dataset.projectCommentJump
            );
          }, 120);
        }
      );

    els.projectCommentsList.appendChild(
      card
    );
  });
}

function openProjectCommentsPanel() {
  if (!els.projectCommentsPanel) {
    return;
  }

  renderProjectCommentsPanel();

 els.projectCommentsPanel.classList.remove(
  'hidden'
);

if (
  !els.projectCommentsPanel.style.left
) {
  els.projectCommentsPanel.style.left =
    '80px';

  els.projectCommentsPanel.style.top =
    '80px';
}
}

function closeProjectCommentsPanel() {
  els.projectCommentsPanel?.classList.add(
    'hidden'
  );
}

function renderInlineCommentsSummary(doc = null) {
  if (!els.inlineCommentsSummary) {
    return;
  }

  const comments =
    getInlineComments(doc);

  const counts =
    getInlineCommentCounts(comments);

  if (!counts.total) {
    els.inlineCommentsSummary.innerHTML =
      '<div class="empty-note">No comments yet.</div>';
    return;
  }

  els.inlineCommentsSummary.innerHTML = `
    <div class="inline-comments-summary-row">
      <span>
        <strong>${counts.open}</strong>
        open
      </span>

      <span>
        <strong>${counts.resolved}</strong>
        resolved
      </span>
    </div>
  `;
}

function renderInlineCommentCardsInto(container, allComments = []) {
  if (!container) {
    return;
  }

  const comments =
    allComments.filter(comment => {
      return showResolvedInlineComments
        ? true
        : !comment.resolved;
    });

  if (!allComments.length) {
    container.innerHTML =
      '<div class="empty-note">No comments yet.</div>';
    return;
  }

  if (!comments.length) {
    container.innerHTML =
      '<div class="empty-note">No open comments. Resolved comments are hidden.</div>';
    return;
  }

  container.innerHTML = '';

  comments
    .slice()
    .sort((a, b) => {
      return Number(b.createdAt || 0) -
        Number(a.createdAt || 0);
    })
    .forEach(comment => {
      const card =
        document.createElement('article');

      const targetStatus =
        getInlineCommentTargetStatus(comment.id);

      card.className = [
        'inline-comment-card',
        comment.resolved ? 'resolved' : '',
        targetStatus === 'missing' ? 'missing-target' : ''
      ]
        .filter(Boolean)
        .join(' ');

      const quote =
        String(comment.quote || '')
          .trim();

      const shortQuote =
        quote.length > 90
          ? `${quote.slice(0, 87)}...`
          : quote;

      card.innerHTML = `
        <button
          type="button"
          class="inline-comment-jump-btn"
          data-inline-comment-jump="${escapeHtml(comment.id)}"
        >
          <strong>${escapeHtml(shortQuote || 'Comment')}</strong>
        </button>

        <div class="inline-comment-note">
          ${escapeHtml(comment.note || '')}
        </div>

        <div class="inline-comment-meta">
          ${
            comment.resolved
              ? '<span class="inline-comment-status resolved">Resolved</span>'
              : '<span class="inline-comment-status open">Open</span>'
          }

          ${
            targetStatus === 'missing'
              ? '<span class="inline-comment-status missing">Target missing</span>'
              : ''
          }
        </div>

        <div class="inline-comment-actions">
          <button
            type="button"
            data-inline-comment-toggle-resolved="${escapeHtml(comment.id)}"
          >
            ${comment.resolved ? 'Reopen' : 'Resolve'}
          </button>

          <button
            type="button"
            data-inline-comment-delete="${escapeHtml(comment.id)}"
          >
            Delete
          </button>
        </div>
      `;

      card
        .querySelector('[data-inline-comment-jump]')
        ?.addEventListener('click', event => {
          jumpToInlineComment(
            event.currentTarget.dataset.inlineCommentJump
          );
        });

      card
        .querySelector('[data-inline-comment-toggle-resolved]')
        ?.addEventListener('click', async event => {
          await toggleInlineCommentResolved(
            event.currentTarget.dataset.inlineCommentToggleResolved
          );
        });

      card
        .querySelector('[data-inline-comment-delete]')
        ?.addEventListener('click', async event => {
          await deleteInlineComment(
            event.currentTarget.dataset.inlineCommentDelete
          );
        });

      container.appendChild(card);
    });
}

async function getCustomMetadataFields() {
  const saved =
    await NaviStorage.getSetting(
      CUSTOM_METADATA_FIELDS_KEY,
      []
    );

  if (!Array.isArray(saved)) {
    return [];
  }

  return saved
    .map(field => {
      const type =
        normalizeCustomMetadataFieldType(field.type);

      return {
        id:
          field.id ||
          crypto.randomUUID(),

        name:
          normalizeCustomMetadataFieldName(field.name) ||
          'Untitled Field',

        type,

        options:
          type === 'dropdown' && Array.isArray(field.options)
            ? field.options.map(String).filter(Boolean)
            : [],

        createdAt:
          Number(field.createdAt || Date.now()),

        updatedAt:
          Number(field.updatedAt || field.createdAt || Date.now())
      };
    })
    .filter(field => {
      return Boolean(field.id && field.name);
    });
}

function getInlineCommentTargetStatus(commentId) {
  return findInlineCommentMark(commentId)
    ? 'found'
    : 'missing';
}

function updateResolvedCommentsToggle() {
  if (!els.toggleResolvedCommentsBtn) {
    return;
  }

  els.toggleResolvedCommentsBtn.textContent =
    showResolvedInlineComments
      ? 'Hide Resolved'
      : 'Show Resolved';

  els.toggleResolvedCommentsBtn.classList.toggle(
    'active',
    showResolvedInlineComments
  );
}

function toggleResolvedInlineComments() {
  showResolvedInlineComments =
    !showResolvedInlineComments;

  updateResolvedCommentsToggle();
  renderInlineCommentsPanel();
}

async function saveCustomMetadataFields(fields = []) {
  const cleanFields =
    Array.isArray(fields)
      ? fields.map(field => {
          const type =
            normalizeCustomMetadataFieldType(field.type);

          return {
            id:
              field.id ||
              crypto.randomUUID(),

            name:
              normalizeCustomMetadataFieldName(field.name) ||
              'Untitled Field',

            type,

            options:
              type === 'dropdown'
                ? Array.isArray(field.options)
                  ? field.options.map(String).filter(Boolean)
                  : []
                : [],

            createdAt:
              Number(field.createdAt || Date.now()),

            updatedAt:
              Number(field.updatedAt || Date.now())
          };
        })
      : [];

  await NaviStorage.saveSetting(
    CUSTOM_METADATA_FIELDS_KEY,
    cleanFields
  );

  return cleanFields;
}

async function addCustomMetadataField({
  name,
  type,
  options = []
} = {}) {
  const cleanName =
    normalizeCustomMetadataFieldName(name);

  if (!cleanName) {
    showAppNotice(
      'Enter a field name.',
      'Missing field name'
    );
    return null;
  }

  const cleanType =
    normalizeCustomMetadataFieldType(type);

  const fields =
    await getCustomMetadataFields();

  const duplicate =
    fields.some(field => {
      return field.name.toLowerCase() === cleanName.toLowerCase();
    });

  if (duplicate) {
    showAppNotice(
      `"${cleanName}" already exists.`,
      'Duplicate field'
    );
    return null;
  }

  const now =
    Date.now();

  const field = {
    id:
      crypto.randomUUID(),

    name:
      cleanName,

    type:
      cleanType,

    options:
      cleanType === 'dropdown'
        ? options
        : [],

    createdAt:
      now,

    updatedAt:
      now
  };

  fields.push(field);

  await saveCustomMetadataFields(fields);

  return field;
}

function getInlineComments(doc) {
  return Array.isArray(doc?.inlineComments)
    ? doc.inlineComments
    : [];
}

function getEditorContentRoot() {
  if (!els.editor) {
    return null;
  }

  return (
    els.editor.querySelector('.ProseMirror') ||
    els.editor
  );
}

function getCurrentSelectedEditorText() {
  if (window.NaviTiptap?.getEditor) {
    const editor =
      window.NaviTiptap.getEditor();

    if (editor) {
      const { state } =
        editor;

      const { from, to } =
        state.selection;

      if (from !== to) {
        return state.doc
          .textBetween(from, to, ' ')
          .trim();
      }
    }
  }

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) {
    return '';
  }

  const root =
    getEditorContentRoot();

  const range =
    selection.getRangeAt(0);

  if (
    root &&
    root.contains(range.commonAncestorContainer)
  ) {
    return selection.toString().trim();
  }

  return '';
}

function applyInlineCommentMark(commentId) {
  if (!commentId) {
    return false;
  }

  if (window.NaviTiptap?.run) {
    return window.NaviTiptap.run(
      'inlineComment',
      commentId
    );
  }

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return false;
  }

  const range =
    selection.getRangeAt(0);

  const root =
    getEditorContentRoot();

  if (
    !root ||
    !root.contains(range.commonAncestorContainer)
  ) {
    return false;
  }

  const span =
    document.createElement('span');

  span.className =
    'inline-comment-mark';

  span.dataset.inlineCommentId =
    commentId;

  try {
    range.surroundContents(span);
  } catch {
    const contents =
      range.extractContents();

    span.appendChild(contents);
    range.insertNode(span);
  }

  selection.removeAllRanges();

  window.dispatchEvent(
    new CustomEvent('naviwriter:editor-input')
  );

  return true;
}

function findInlineCommentMark(commentId) {
  const root =
    getEditorContentRoot();

  if (!root || !commentId) {
    return null;
  }

  return root.querySelector(
    `[data-inline-comment-id="${CSS.escape(commentId)}"]`
  );
}

function flashInlineCommentTarget(target) {
  if (!target) {
    return;
  }

  target.classList.add(
    'inline-comment-jump-highlight'
  );

  setTimeout(() => {
    target.classList.remove(
      'inline-comment-jump-highlight'
    );
  }, 1300);
}

function jumpToInlineComment(commentId) {
  const target =
    findInlineCommentMark(commentId);

  if (!target) {
    showAppNotice(
      'Could not find the marked text. The text may have been edited.',
      'Comment target missing'
    );
    return;
  }

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  flashInlineCommentTarget(target);
}

async function renderInlineCommentsPanel(doc = null) {
  updateResolvedCommentsToggle();

  const currentDoc =
    doc ||
    (
      currentDocumentId
        ? await NaviStorage.getDocument(currentDocumentId)
        : null
    );

  const comments =
    getInlineComments(currentDoc);

  renderInlineCommentsSummary(currentDoc);

  if (els.commentsDrawerSubtitle) {
    const counts =
      getInlineCommentCounts(comments);

    els.commentsDrawerSubtitle.textContent =
      `${counts.open} open · ${counts.resolved} resolved`;
  }

  renderInlineCommentCardsInto(
    els.commentsDrawerList,
    comments
  );
}

async function openCommentsDrawer() {
  if (!els.commentsDrawer) {
    return;
  }

  els.commentsDrawer.classList.remove('hidden');

  requestAnimationFrame(() => {
    placeCommentsDrawerDefaultIfNeeded();
  });

  await renderInlineCommentsPanel();
  
  renderProjectCommentsPanel();
  
}

function closeCommentsDrawer() {
  if (els.commentsDrawer) {
    els.commentsDrawer.classList.add('hidden');
  }

  commentsDrawerDragging = false;
}

async function addInlineCommentFromSelection() {
  if (!currentDocumentId) {
    showAppNotice(
      'Open a document first.',
      'No document selected'
    );
    return;
  }

  const quote =
    getCurrentSelectedEditorText();

  if (!quote) {
    showAppNotice(
      'Select text in the editor before adding a comment.',
      'No text selected'
    );
    return;
  }

  const note =
    await openTextInputModal({
      title: 'Add Comment',
      message: 'Write a note for the selected text.',
      label: 'Comment',
      defaultValue: '',
      placeholder: 'Why does this line matter?',
      submitText: 'Add Comment'
    });

  if (!note || !note.trim()) {
    return;
  }

  const commentId =
    crypto.randomUUID();

  const marked =
    applyInlineCommentMark(commentId);

  if (!marked) {
    showAppNotice(
      'Could not mark the selected text.',
      'Comment not added'
    );
    return;
  }

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) {
    return;
  }

  const snapshot =
    NaviEditor.getEditorSnapshot();

  const comments =
    getInlineComments(doc);

  const now =
    Date.now();

  const nextComment = {
    id: commentId,
    quote,
    note: note.trim(),
    createdAt: now,
    updatedAt: now,
    resolved: false
  };

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      ...snapshot,
      inlineComments: [
        ...comments,
        nextComment
      ],
      updatedAt: now
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  await renderInlineCommentsPanel(saved);
  
  renderProjectCommentsPanel();
  
  renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus(
    'Comment added'
  );
}

async function toggleInlineCommentResolved(commentId) {
  if (!currentDocumentId || !commentId) {
    return;
  }

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) {
    return;
  }

  const comments =
    getInlineComments(doc);

  let changed = false;

  const nextComments =
    comments.map(comment => {
      if (comment.id !== commentId) {
        return comment;
      }

      changed = true;

      return {
        ...comment,
        resolved:
          !comment.resolved,
        updatedAt:
          Date.now()
      };
    });

  if (!changed) {
    return;
  }

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      inlineComments:
        nextComments,
      updatedAt:
        Date.now()
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  await renderInlineCommentsPanel(saved);
  
  renderProjectCommentsPanel();

  NaviEditor.setSaveStatus(
    'Comment updated'
  );
}

async function deleteInlineComment(commentId) {
  if (!currentDocumentId || !commentId) {
    return;
  }

  const ok =
    await openConfirmModal({
      title: 'Delete Comment',
      message: 'Delete this inline comment?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

  if (!ok) {
    return;
  }

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) {
    return;
  }

  const comments =
    getInlineComments(doc)
      .filter(comment => {
        return comment.id !== commentId;
      });

  /*
    Try to remove the visible mark in the editor DOM.
    Tiptap state cleanup is intentionally conservative:
    if the mark remains visually, saving after deletion will still
    preserve document content safely.
  */
  const mark =
    findInlineCommentMark(commentId);

  if (mark) {
    const parent =
      mark.parentNode;

    while (mark.firstChild) {
      parent.insertBefore(
        mark.firstChild,
        mark
      );
    }

    mark.remove();
  }

  const snapshot =
    NaviEditor.getEditorSnapshot();

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      ...snapshot,
      inlineComments:
        comments,
      updatedAt:
        Date.now()
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  await renderInlineCommentsPanel(saved);
  
  renderProjectCommentsPanel();
  
  renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus(
    'Comment deleted'
  );
}

async function deleteCustomMetadataField(fieldId) {
  if (!fieldId) {
    return;
  }

  const fields =
    await getCustomMetadataFields();

  const field =
    fields.find(item => {
      return item.id === fieldId;
    });

  if (!field) {
    return;
  }

  const ok =
    await openConfirmModal({
      title: 'Delete Custom Field',
      message:
        `Delete "${field.name}"? Existing document values for this field will not be shown anymore.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

  if (!ok) {
    return;
  }

  const nextFields =
    fields.filter(item => {
      return item.id !== fieldId;
    });

  await saveCustomMetadataFields(nextFields);
  
  await renderCustomMetadataValues();

  NaviEditor.setSaveStatus('Custom field deleted');
}

function updateCustomMetadataOptionsVisibility() {
  const type =
    els.customMetadataFieldTypeSelect?.value || 'text';

  if (els.customMetadataOptionsWrap) {
    els.customMetadataOptionsWrap.classList.toggle(
      'hidden',
      type !== 'dropdown'
    );
  }
}

async function renderCustomMetadataFieldsModal() {
  if (!els.customMetadataFieldsList) {
    return;
  }

  const fields =
    await getCustomMetadataFields();

  if (els.customMetadataFieldsCount) {
    els.customMetadataFieldsCount.textContent =
      `${fields.length} field${fields.length === 1 ? '' : 's'}`;
  }

  if (!fields.length) {
    els.customMetadataFieldsList.innerHTML =
      '<div class="empty-note">No custom fields yet.</div>';
    return;
  }

  els.customMetadataFieldsList.innerHTML = '';

  fields.forEach(field => {
    const row =
      document.createElement('article');

    row.className =
      'custom-metadata-field-row';

    const optionsText =
      field.type === 'dropdown' && field.options.length
        ? field.options.join(', ')
        : '';

    row.innerHTML = `
      <div class="custom-metadata-field-main">
        <strong>${escapeHtml(field.name)}</strong>

        <div class="custom-metadata-field-meta">
          <span>${escapeHtml(getCustomMetadataFieldTypeLabel(field.type))}</span>

          ${
            optionsText
              ? `<span>Options: ${escapeHtml(optionsText)}</span>`
              : ''
          }
        </div>
      </div>

      <button
        type="button"
        class="custom-metadata-field-delete-btn"
        data-custom-metadata-field-id="${escapeHtml(field.id)}"
        title="Delete field"
      >
        ×
      </button>
    `;

    row
      .querySelector('[data-custom-metadata-field-id]')
      ?.addEventListener('click', async event => {
        const fieldId =
          event.currentTarget.dataset.customMetadataFieldId;

        if (!fieldId) {
          return;
        }

        await deleteCustomMetadataField(fieldId);

        await renderCustomMetadataFieldsModal();
      });

    els.customMetadataFieldsList.appendChild(row);
  });
}

async function openCustomMetadataFieldsModal() {
  if (!els.customMetadataFieldsModal) {
    return;
  }

  if (els.customMetadataFieldNameInput) {
    els.customMetadataFieldNameInput.value = '';
  }

  if (els.customMetadataFieldTypeSelect) {
    els.customMetadataFieldTypeSelect.value = 'text';
  }

  if (els.customMetadataFieldOptionsInput) {
    els.customMetadataFieldOptionsInput.value = '';
  }

  updateCustomMetadataOptionsVisibility();

  await renderCustomMetadataFieldsModal();

  els.customMetadataFieldsModal.classList.remove('hidden');

  setTimeout(() => {
    els.customMetadataFieldNameInput?.focus();
  }, 0);
}

function closeCustomMetadataFieldsModal() {
  if (els.customMetadataFieldsModal) {
    els.customMetadataFieldsModal.classList.add('hidden');
  }
}

async function submitCustomMetadataFieldAdd() {
  const name =
    els.customMetadataFieldNameInput?.value || '';

  const type =
    els.customMetadataFieldTypeSelect?.value || 'text';

  const options =
    type === 'dropdown'
      ? parseCustomMetadataOptions(
          els.customMetadataFieldOptionsInput?.value || ''
        )
      : [];

  if (type === 'dropdown' && !options.length) {
    showAppNotice(
      'Add at least one dropdown option.',
      'Missing dropdown options'
    );
    return;
  }

  const field =
    await addCustomMetadataField({
      name,
      type,
      options
    });

  if (!field) {
    return;
  }

  if (els.customMetadataFieldNameInput) {
    els.customMetadataFieldNameInput.value = '';
  }

  if (els.customMetadataFieldOptionsInput) {
    els.customMetadataFieldOptionsInput.value = '';
  }

  if (els.customMetadataFieldTypeSelect) {
    els.customMetadataFieldTypeSelect.value = 'text';
  }

  updateCustomMetadataOptionsVisibility();

  await renderCustomMetadataFieldsModal();
  
  await renderCustomMetadataValues();
  
  if (
  els.outlinerCustomColumnsModal &&
  !els.outlinerCustomColumnsModal.classList.contains('hidden')
) {
  await renderOutlinerCustomColumnsModal();
}

if (
  els.outlinerModal &&
  !els.outlinerModal.classList.contains('hidden')
) {
  await renderOutliner();
}

  NaviEditor.setSaveStatus('Custom field added');
}

async function getOutlinerCustomMetadataColumnIds() {
  const saved =
    await NaviStorage.getSetting(
      OUTLINER_CUSTOM_METADATA_COLUMNS_KEY,
      []
    );

  if (!Array.isArray(saved)) {
    return [];
  }

  return saved
    .map(id => String(id || ''))
    .filter(Boolean);
}

async function saveOutlinerCustomMetadataColumnIds(ids = []) {
  const cleanIds =
    Array.from(
      new Set(
        Array.isArray(ids)
          ? ids.map(id => String(id || '')).filter(Boolean)
          : []
      )
    );

  await NaviStorage.saveSetting(
    OUTLINER_CUSTOM_METADATA_COLUMNS_KEY,
    cleanIds
  );

  return cleanIds;
}

async function getVisibleOutlinerCustomMetadataFields() {
  const fields =
    await getCustomMetadataFields();

  const selectedIds =
    await getOutlinerCustomMetadataColumnIds();

  const fieldMap =
    new Map(
      fields.map(field => {
        return [field.id, field];
      })
    );

  const visibleFields =
    selectedIds
      .map(id => {
        return fieldMap.get(id);
      })
      .filter(Boolean);

  /*
    If fields were deleted, prune dead IDs quietly.
  */
  const prunedIds =
    visibleFields.map(field => field.id);

  if (prunedIds.length !== selectedIds.length) {
    await saveOutlinerCustomMetadataColumnIds(prunedIds);
  }

  return visibleFields;
}

function formatCustomMetadataOutlinerValue(field, value) {
  const cleanValue =
    normalizeCustomMetadataValue(
      field,
      value
    );

  if (
    cleanValue === '' ||
    cleanValue === null ||
    cleanValue === undefined
  ) {
    return '<span class="outliner-muted">—</span>';
  }

  if (field.type === 'checkbox') {
    return cleanValue
      ? '<span class="outliner-custom-check yes">Yes</span>'
      : '<span class="outliner-custom-check no">No</span>';
  }

  if (field.type === 'date') {
    return escapeHtml(
      String(cleanValue || '')
    );
  }

  if (field.type === 'number') {
    return escapeHtml(
      String(cleanValue)
    );
  }

  const text =
    String(cleanValue || '');

  const shortText =
    text.length > 80
      ? `${text.slice(0, 77)}...`
      : text;

  return escapeHtml(shortText);
}

async function renderOutlinerCustomColumnsModal() {
  if (!els.outlinerCustomColumnsList) {
    return;
  }

  const fields =
    await getCustomMetadataFields();

  const selectedIds =
    new Set(
      await getOutlinerCustomMetadataColumnIds()
    );

  if (!fields.length) {
    els.outlinerCustomColumnsList.innerHTML =
      '<div class="empty-note">No custom fields yet. Create fields from Document Details first.</div>';
    return;
  }

  els.outlinerCustomColumnsList.innerHTML = '';

  fields.forEach(field => {
    const row =
      document.createElement('label');

    row.className =
      'outliner-custom-column-row';

    row.innerHTML = `
      <input
        type="checkbox"
        value="${escapeHtml(field.id)}"
        ${selectedIds.has(field.id) ? 'checked' : ''}
      />

      <span class="outliner-custom-column-main">
        <strong>${escapeHtml(field.name)}</strong>
        <small>${escapeHtml(getCustomMetadataFieldTypeLabel(field.type))}</small>
      </span>
    `;

    row
      .querySelector('input')
      ?.addEventListener('change', async () => {
        const checkedIds =
          Array.from(
            els.outlinerCustomColumnsList
              .querySelectorAll('input[type="checkbox"]:checked')
          )
            .map(input => input.value)
            .filter(Boolean);

        await saveOutlinerCustomMetadataColumnIds(
          checkedIds
        );

        if (
          els.outlinerModal &&
          !els.outlinerModal.classList.contains('hidden')
        ) {
          await renderOutliner();
        }
      });

    els.outlinerCustomColumnsList.appendChild(row);
  });
}

async function openOutlinerCustomColumnsModal() {
  if (!els.outlinerCustomColumnsModal) {
    return;
  }

  await renderOutlinerCustomColumnsModal();

  els.outlinerCustomColumnsModal.classList.remove('hidden');
}

function closeOutlinerCustomColumnsModal() {
  if (els.outlinerCustomColumnsModal) {
    els.outlinerCustomColumnsModal.classList.add('hidden');
  }
}

function renderOutlinerCustomMetadataCells(doc, fields = []) {
  const values =
    getDocumentCustomMetadata(doc);

  return fields
    .map(field => {
      return `
        <td class="outliner-custom-metadata-cell">
          ${formatCustomMetadataOutlinerValue(
            field,
            values[field.id]
          )}
        </td>
      `;
    })
    .join('');
}

async function renameSplitPaneDocument() {
  if (!splitPaneDocId) {
    showAppNotice(
      'Choose a split document first.',
      'No split document selected'
    );
    return;
  }

  if (splitPaneEditable) {
    await saveSplitPaneDocument();
  }

  const doc =
    await NaviStorage.getDocument(splitPaneDocId);

  if (!doc) {
    showAppNotice(
      'Split document not found.',
      'Document missing'
    );
    return;
  }

  const nextTitle =
    await openTextInputModal({
      title: 'Rename Split Document',
      message: 'Give this split document a new title.',
      label: 'Document title',
      defaultValue: doc.title || 'Untitled Document',
      placeholder: 'Untitled Document',
      submitText: 'Rename'
    });

  if (!nextTitle || !nextTitle.trim()) {
    return;
  }

  const cleanTitle =
    nextTitle.trim();

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      title: cleanTitle,
      updatedAt: Date.now()
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  renderDocumentList(documentsCache);

  if (els.splitDocSelect) {
    await populateSplitDocSelect();
    els.splitDocSelect.value =
      saved.id;
  }

  await renderSplitPaneDocument();

  NaviEditor.setSaveStatus(
    'Split document renamed'
  );
}

function getSplitPaneEditorElements() {
  return {
    titleInput:
      els.splitDocContent?.querySelector(
        '[data-split-title-input]'
      ) || null,

    body:
      els.splitDocContent?.querySelector(
        '[data-split-edit-body]'
      ) || null
  };
}

function getSplitPanePlainTextFromHtml(html = '') {
  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html || '';

  return wrapper.innerText || '';
}

function updateSplitPaneEditButtons() {
  if (els.editSplitPaneBtn) {
    els.editSplitPaneBtn.classList.toggle(
      'active',
      splitPaneEditable
    );

    els.editSplitPaneBtn.textContent =
      splitPaneEditable
        ? 'Editing'
        : 'Edit';
  }

  if (els.saveSplitPaneBtn) {
    els.saveSplitPaneBtn.classList.toggle(
      'hidden',
      !splitPaneEditable
    );
  }
}

function setSplitPaneEditable(enabled) {
  splitPaneEditable =
    Boolean(enabled);

  updateSplitPaneEditButtons();

  renderSplitPaneDocument();
}

function toggleSplitPaneEditable() {
  setSplitPaneEditable(
    !splitPaneEditable
  );
}

async function buildGlobalGraphData() {
  const docs =
    documentsCache.length
      ? documentsCache
      : await NaviStorage.getAllDocuments();

  const filters =
    getLocalGraphFilterState();

  const nodeMap =
    new Map();

  function addNode(type, id, label = '') {
    const key =
      `${type}:${id}`;

    if (nodeMap.has(key)) {
      return nodeMap.get(key);
    }

    const node = {
      id: key,
      entityType: type,
      entityId: id,
      label,
      isCurrent:
        type === 'document' &&
        id === currentDocumentId
    };

    nodeMap.set(key, node);

    return node;
  }

  function addDocumentNode(doc) {
    return addNode(
      'document',
      doc.id,
      doc.title || 'Untitled Document'
    );
  }

  const edges = [];

  function addEdge({
    id,
    sourceEntityType,
    sourceEntityId,
    sourceLabel,
    targetEntityType,
    targetEntityId,
    targetLabel,
    relationType = 'related',
    strength = 1,
    note = '',
    isImplicit = false
  }) {
    const sourceNode =
      addNode(
        sourceEntityType,
        sourceEntityId,
        sourceLabel
      );

    const targetNode =
      addNode(
        targetEntityType,
        targetEntityId,
        targetLabel
      );

    edges.push({
      id,
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      relationType,
      strength: Number(strength || 1) || 1,
      note,
      isImplicit
    });
  }

  const docsById =
    new Map(
      docs.map(doc => [doc.id, doc])
    );

  /*
    Always include document nodes.
    This makes orphan docs visible in the global graph.
  */
  docs.forEach(doc => {
    addDocumentNode(doc);
  });

  if (filters.explicit) {
    const relationships =
      await getRelationships();

    for (const rel of relationships) {
      const sourceName =
        await getEntityName(
          rel.sourceEntityType,
          rel.sourceEntityId
        );

      const targetName =
        await getEntityName(
          rel.targetEntityType,
          rel.targetEntityId
        );

      addEdge({
        id: rel.id,
        sourceEntityType: rel.sourceEntityType,
        sourceEntityId: rel.sourceEntityId,
        sourceLabel: sourceName,
        targetEntityType: rel.targetEntityType,
        targetEntityId: rel.targetEntityId,
        targetLabel: targetName,
        relationType: rel.relationType || 'related',
        strength: rel.strength,
        note: rel.note || '',
        isImplicit: false
      });
    }
  }

  if (filters.collections) {
    const collections =
      await getCollections();

    collections.forEach(collection => {
      const documentIds =
        Array.isArray(collection.documentIds)
          ? collection.documentIds
          : [];

      documentIds.forEach(docId => {
        const doc =
          docsById.get(docId);

        if (!doc) {
          return;
        }

        addEdge({
          id: `global-implicit-collection-${collection.id}-${docId}`,
          sourceEntityType: 'collection',
          sourceEntityId: collection.id,
          sourceLabel: collection.name || 'Untitled Collection',
          targetEntityType: 'document',
          targetEntityId: docId,
          targetLabel: doc.title || 'Untitled Document',
          relationType: 'contains',
          strength: 1,
          note: 'Implicit: collection membership',
          isImplicit: true
        });
      });
    });
  }

  if (filters.folders) {
    docs.forEach(doc => {
      const folder =
        getDocumentFolderName(doc);

      if (!folder || folder === 'Unfiled') {
        return;
      }

      addEdge({
        id: `global-implicit-folder-${folder}-${doc.id}`,
        sourceEntityType: 'folder',
        sourceEntityId: folder,
        sourceLabel: folder,
        targetEntityType: 'document',
        targetEntityId: doc.id,
        targetLabel: doc.title || 'Untitled Document',
        relationType: 'contains',
        strength: 1,
        note: 'Implicit: folder membership',
        isImplicit: true
      });
    });
  }

  if (filters.sources) {
    docs.forEach(doc => {
      const sources =
        getCurrentSourceList(doc);

      sources.forEach(source => {
        addEdge({
          id: `global-implicit-source-${doc.id}-${source.id}`,
          sourceEntityType: 'document',
          sourceEntityId: doc.id,
          sourceLabel: doc.title || 'Untitled Document',
          targetEntityType: 'source',
          targetEntityId: getSourceEntityId(
            doc.id,
            source.id
          ),
          targetLabel: source.title || 'Untitled Source',
          relationType: 'has source',
          strength: 1,
          note: 'Implicit: research source',
          isImplicit: true
        });
      });
    });
  }

  if (filters.tags) {
    docs.forEach(doc => {
      const tags =
        Array.isArray(doc.tags)
          ? doc.tags
          : [];

      tags
        .map(tag => String(tag || '').trim())
        .filter(Boolean)
        .forEach(tag => {
          addEdge({
            id: `global-implicit-tag-${tag}-${doc.id}`,
            sourceEntityType: 'tag',
            sourceEntityId: tag,
            sourceLabel: `#${tag}`,
            targetEntityType: 'document',
            targetEntityId: doc.id,
            targetLabel: doc.title || 'Untitled Document',
            relationType: 'includes',
            strength: 1,
            note: 'Implicit: document tag',
            isImplicit: true
          });
        });
    });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

async function buildLocalGraphData(docId) {
  if (!docId) {
    return {
      nodes: [],
      edges: []
    };
  }

  const currentDoc =
    await NaviStorage.getDocument(docId);

  if (!currentDoc) {
    return {
      nodes: [],
      edges: []
    };
  }

  const filters =
    getLocalGraphFilterState();

  const nodeMap =
    new Map();

  function addNode(type, id, label = '') {
    const key =
      `${type}:${id}`;

    if (nodeMap.has(key)) {
      return nodeMap.get(key);
    }

    const node = {
      id: key,
      entityType: type,
      entityId: id,
      label,
      isCurrent:
        type === 'document' &&
        id === docId
    };

    nodeMap.set(key, node);

    return node;
  }

  const currentNode =
    addNode(
      'document',
      currentDoc.id,
      currentDoc.title || 'Untitled Document'
    );

  const edges = [];

  function addEdge({
    id,
    sourceEntityType,
    sourceEntityId,
    sourceLabel,
    targetEntityType,
    targetEntityId,
    targetLabel,
    relationType = 'related',
    strength = 1,
    note = '',
    isImplicit = false
  }) {
    const sourceNode =
      addNode(
        sourceEntityType,
        sourceEntityId,
        sourceLabel
      );

    const targetNode =
      addNode(
        targetEntityType,
        targetEntityId,
        targetLabel
      );

    edges.push({
      id,
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      relationType,
      strength: Number(strength || 1) || 1,
      note,
      isImplicit
    });
  }

  if (filters.explicit) {
    const relationships =
      await getRelationships();

    const localRelationships =
      relationships.filter(rel => {
        return (
          rel.sourceEntityType === 'document' &&
          rel.sourceEntityId === docId
        ) || (
          rel.targetEntityType === 'document' &&
          rel.targetEntityId === docId
        );
      });

    for (const rel of localRelationships) {
      const sourceName =
        await getEntityName(
          rel.sourceEntityType,
          rel.sourceEntityId
        );

      const targetName =
        await getEntityName(
          rel.targetEntityType,
          rel.targetEntityId
        );

      addEdge({
        id: rel.id,
        sourceEntityType: rel.sourceEntityType,
        sourceEntityId: rel.sourceEntityId,
        sourceLabel: sourceName,
        targetEntityType: rel.targetEntityType,
        targetEntityId: rel.targetEntityId,
        targetLabel: targetName,
        relationType: rel.relationType || 'related',
        strength: rel.strength,
        note: rel.note || '',
        isImplicit: false
      });
    }
  }

  if (filters.collections) {
    const collections =
      await getCollections();

    collections.forEach(collection => {
      const documentIds =
        Array.isArray(collection.documentIds)
          ? collection.documentIds
          : [];

      if (!documentIds.includes(docId)) {
        return;
      }

      addEdge({
        id: `local-implicit-collection-${collection.id}-${docId}`,
        sourceEntityType: 'collection',
        sourceEntityId: collection.id,
        sourceLabel: collection.name || 'Untitled Collection',
        targetEntityType: 'document',
        targetEntityId: docId,
        targetLabel: currentDoc.title || 'Untitled Document',
        relationType: 'contains',
        strength: 1,
        note: 'Implicit: collection membership',
        isImplicit: true
      });
    });
  }

  if (filters.folders) {
    const folder =
      getDocumentFolderName(currentDoc);

    if (folder && folder !== 'Unfiled') {
      addEdge({
        id: `local-implicit-folder-${folder}-${docId}`,
        sourceEntityType: 'folder',
        sourceEntityId: folder,
        sourceLabel: folder,
        targetEntityType: 'document',
        targetEntityId: docId,
        targetLabel: currentDoc.title || 'Untitled Document',
        relationType: 'contains',
        strength: 1,
        note: 'Implicit: folder membership',
        isImplicit: true
      });
    }
  }

  if (filters.sources) {
    const sources =
      getCurrentSourceList(currentDoc);

    sources.forEach(source => {
      addEdge({
        id: `local-implicit-source-${docId}-${source.id}`,
        sourceEntityType: 'document',
        sourceEntityId: docId,
        sourceLabel: currentDoc.title || 'Untitled Document',
        targetEntityType: 'source',
        targetEntityId: getSourceEntityId(
          docId,
          source.id
        ),
        targetLabel: source.title || 'Untitled Source',
        relationType: 'has source',
        strength: 1,
        note: 'Implicit: research source',
        isImplicit: true
      });
    });
  }

  if (filters.tags) {
    const tags =
      Array.isArray(currentDoc.tags)
        ? currentDoc.tags
        : [];

    tags
      .map(tag => String(tag || '').trim())
      .filter(Boolean)
      .forEach(tag => {
        addEdge({
          id: `local-implicit-tag-${tag}-${docId}`,
          sourceEntityType: 'tag',
          sourceEntityId: tag,
          sourceLabel: `#${tag}`,
          targetEntityType: 'document',
          targetEntityId: docId,
          targetLabel: currentDoc.title || 'Untitled Document',
          relationType: 'includes',
          strength: 1,
          note: 'Implicit: document tag',
          isImplicit: true
        });
      });
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

function resetLocalGraphState() {
  localGraphZoom = 1;

  localGraphPan = {
    x: 0,
    y: 0
  };

  localGraphPositions = {};
  localGraphSelectedNodeId = null;
}

function renderLocalGraphMinimap() {
  if (
    !els.localGraphMinimap ||
    els.localGraphMinimap.classList.contains('hidden') ||
    !els.localGraphMinimapBody ||
    !els.localGraphMinimapWorld ||
    !els.localGraphMinimapViewport
  ) {
    return;
  }

  const bounds =
    getLocalGraphBounds();

  if (!bounds) {
    return;
  }

  const bodyRect =
    els.localGraphMinimapBody.getBoundingClientRect();

  const padding =
    8;

  const paddedWidth =
    bounds.width + 260;

  const paddedHeight =
    bounds.height + 260;

  const scaleX =
    (bodyRect.width - padding * 2) /
    Math.max(1, paddedWidth);

  const scaleY =
    (bodyRect.height - padding * 2) /
    Math.max(1, paddedHeight);

  localGraphMinimapScale =
    Math.max(
      0.01,
      Math.min(scaleX, scaleY)
    );

  const offsetX =
    bounds.minX - 130;

  const offsetY =
    bounds.minY - 130;

  els.localGraphMinimapWorld.dataset.offsetX =
    String(offsetX);

  els.localGraphMinimapWorld.dataset.offsetY =
    String(offsetY);

  els.localGraphMinimapWorld.style.left =
    `${padding}px`;

  els.localGraphMinimapWorld.style.top =
    `${padding}px`;

  els.localGraphMinimapWorld.style.width =
    `${paddedWidth * localGraphMinimapScale}px`;

  els.localGraphMinimapWorld.style.height =
    `${paddedHeight * localGraphMinimapScale}px`;

  els.localGraphMinimapWorld.innerHTML = '';

  localGraphData.nodes.forEach(node => {
    const pos =
      getLocalGraphNodePosition(node.id);

    const dot =
      document.createElement('div');

    dot.className = [
      'local-graph-minimap-node',
      node.isCurrent ? 'current' : '',
      node.id === localGraphSelectedNodeId ? 'selected' : '',
      `entity-${node.entityType}`
    ]
      .filter(Boolean)
      .join(' ');

    dot.style.left =
      `${(pos.x - offsetX) * localGraphMinimapScale}px`;

    dot.style.top =
      `${(pos.y - offsetY) * localGraphMinimapScale}px`;

    els.localGraphMinimapWorld.appendChild(dot);
  });

  updateLocalGraphMinimapViewport();
}

function updateLocalGraphMinimapViewport() {
  if (
    !els.localGraphMinimap ||
    els.localGraphMinimap.classList.contains('hidden') ||
    !els.localGraphMinimapViewport ||
    !els.localGraphSurface ||
    !els.localGraphMinimapWorld
  ) {
    return;
  }

  const offsetX =
    Number(els.localGraphMinimapWorld.dataset.offsetX || 0);

  const offsetY =
    Number(els.localGraphMinimapWorld.dataset.offsetY || 0);

  const surfaceRect =
    els.localGraphSurface.getBoundingClientRect();

  const viewX =
    (-localGraphPan.x / localGraphZoom) - offsetX;

  const viewY =
    (-localGraphPan.y / localGraphZoom) - offsetY;

  const viewW =
    surfaceRect.width / localGraphZoom;

  const viewH =
    surfaceRect.height / localGraphZoom;

  els.localGraphMinimapViewport.style.left =
    `${8 + viewX * localGraphMinimapScale}px`;

  els.localGraphMinimapViewport.style.top =
    `${8 + viewY * localGraphMinimapScale}px`;

  els.localGraphMinimapViewport.style.width =
    `${Math.max(12, viewW * localGraphMinimapScale)}px`;

  els.localGraphMinimapViewport.style.height =
    `${Math.max(12, viewH * localGraphMinimapScale)}px`;
}

function panLocalGraphToMinimapPoint(clientX, clientY) {
  if (
    !els.localGraphMinimapBody ||
    !els.localGraphMinimapWorld ||
    !els.localGraphSurface
  ) {
    return;
  }

  const rect =
    els.localGraphMinimapBody.getBoundingClientRect();

  const offsetX =
    Number(els.localGraphMinimapWorld.dataset.offsetX || 0);

  const offsetY =
    Number(els.localGraphMinimapWorld.dataset.offsetY || 0);

  const localX =
    clientX - rect.left - 8;

  const localY =
    clientY - rect.top - 8;

  const graphX =
    offsetX + localX / localGraphMinimapScale;

  const graphY =
    offsetY + localY / localGraphMinimapScale;

  const surfaceRect =
    els.localGraphSurface.getBoundingClientRect();

  localGraphPan = {
    x:
      surfaceRect.width / 2 -
      graphX * localGraphZoom,

    y:
      surfaceRect.height / 2 -
      graphY * localGraphZoom
  };

  updateLocalGraphTransform();
}

function getEditorHeadingRoot() {
  if (!els.editor) {
    return null;
  }

  /*
    In Tiptap mode, headings live inside .ProseMirror.
    In fallback mode, headings live directly inside #editor.
  */
  return (
    els.editor.querySelector('.ProseMirror') ||
    els.editor
  );
}

function getEditorHeadingNodes() {
  const root =
    getEditorHeadingRoot();

  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll('h1, h2, h3, h4')
  ).filter(heading => {
    return Boolean(
      heading.textContent?.trim()
    );
  });
}

function getScrollableAncestor(element) {
  let node =
    element?.parentElement || null;

  while (
    node &&
    node !== document.body &&
    node !== document.documentElement
  ) {
    const style =
      window.getComputedStyle(node);

    const overflowY =
      style.overflowY;

    const canScroll =
      (
        overflowY === 'auto' ||
        overflowY === 'scroll'
      ) &&
      node.scrollHeight > node.clientHeight;

    if (canScroll) {
      return node;
    }

    node = node.parentElement;
  }

  return (
    document.scrollingElement ||
    document.documentElement
  );
}

function flashDocumentMapTarget(target) {
  if (!target) {
    return;
  }

  target.classList.add(
    'document-map-jump-highlight'
  );

  setTimeout(() => {
    target.classList.remove(
      'document-map-jump-highlight'
    );
  }, 1200);
}

function jumpToDocumentHeading(index) {
  const headings =
    getEditorHeadingNodes();

  const target =
    headings[Number(index)];

  if (!target) {
    return;
  }

  const scrollContainer =
    getScrollableAncestor(target);

  if (
    scrollContainer &&
    scrollContainer !== document.scrollingElement &&
    scrollContainer !== document.documentElement &&
    scrollContainer !== document.body
  ) {
    const containerRect =
      scrollContainer.getBoundingClientRect();

    const targetRect =
      target.getBoundingClientRect();

    const nextTop =
      scrollContainer.scrollTop +
      targetRect.top -
      containerRect.top -
      18;

    scrollContainer.scrollTo({
      top: Math.max(0, nextTop),
      behavior: 'smooth'
    });
  } else {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  flashDocumentMapTarget(target);
}

let documentMapRenderTimer = null;

function safelyRenderDocumentMap() {
  if (typeof renderDocumentMap !== 'function') {
    return;
  }

  try {
    renderDocumentMap();
  } catch (error) {
    console.warn(
      'Document map render failed:',
      error
    );
  }
}

function scheduleDocumentMapRender() {
  clearTimeout(documentMapRenderTimer);

  documentMapRenderTimer = setTimeout(() => {
    safelyRenderDocumentMap();
  }, 120);
}

function renderDocumentMap() {
  const list =
    els.documentMapList || els.outlineList;

  if (!list) {
    return;
  }

  const headings =
    getEditorHeadingNodes();

  if (!headings.length) {
    list.innerHTML =
      '<div class="empty-note">No headings yet.</div>';
    return;
  }

  list.innerHTML = '';

  headings.forEach((heading, index) => {
    const level =
      Number(
        heading.tagName.replace('H', '')
      ) || 1;

    const button =
      document.createElement('button');

    button.type = 'button';

    button.className =
      `document-map-item level-${Math.min(level, 4)}`;

    button.dataset.headingIndex =
      String(index);

    button.textContent =
      heading.textContent?.trim() ||
      `Heading ${index + 1}`;

    /*
      Prevent the outline button from stealing editor selection/focus
      before the click runs. Tiny but helpful.
    */
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
    });

    button.addEventListener('click', event => {
      event.preventDefault();

      jumpToDocumentHeading(
        event.currentTarget.dataset.headingIndex
      );
    });

    list.appendChild(button);
  });
}

async function refreshLocalGraphData({
  keepLayout = false
} = {}) {
  const previousPositions =
    {
      ...localGraphPositions
    };

  if (localGraphMode === 'global') {
    localGraphData =
      await buildGlobalGraphData();
  } else {
    if (!currentDocumentId) {
      return;
    }

    localGraphData =
      await buildLocalGraphData(
        currentDocumentId
      );
  }

  if (keepLayout) {
    localGraphPositions = {};

    localGraphData.nodes.forEach(node => {
      if (previousPositions[node.id]) {
        localGraphPositions[node.id] =
          previousPositions[node.id];
      }
    });
  } else {
    localGraphPositions = {};
  }

  autoLayoutLocalGraph();

  renderLocalGraph();
}

function autoLayoutLocalGraph() {
  const nodes =
    localGraphData.nodes || [];

  if (!nodes.length) {
    return;
  }

  const centerX = 1000;
  const centerY = 700;

  const currentNode =
    nodes.find(node => node.isCurrent) ||
    nodes.find(node => node.entityType === 'document') ||
    nodes[0];

  if (!localGraphPositions[currentNode.id]) {
    localGraphPositions[currentNode.id] = {
      x: centerX,
      y: centerY
    };
  }

  const neighbors =
    nodes.filter(node => {
      return node.id !== currentNode.id;
    });

  /*
    Global graph gets rings.
    Local graph gets one simple ring.
  */
  if (localGraphMode === 'global') {
    const documentNodes =
      neighbors.filter(node => {
        return node.entityType === 'document';
      });

    const entityNodes =
      neighbors.filter(node => {
        return node.entityType !== 'document';
      });

    const documentRadius =
      Math.max(
        280,
        Math.min(
          760,
          190 + documentNodes.length * 18
        )
      );

    const entityRadius =
      documentRadius + 260;

    documentNodes.forEach((node, index) => {
      if (localGraphPositions[node.id]) {
        return;
      }

      const angle =
        (Math.PI * 2 * index) /
        Math.max(1, documentNodes.length);

      localGraphPositions[node.id] = {
        x: centerX + Math.cos(angle) * documentRadius,
        y: centerY + Math.sin(angle) * documentRadius
      };
    });

    entityNodes.forEach((node, index) => {
      if (localGraphPositions[node.id]) {
        return;
      }

      const angle =
        (Math.PI * 2 * index) /
        Math.max(1, entityNodes.length);

      localGraphPositions[node.id] = {
        x: centerX + Math.cos(angle) * entityRadius,
        y: centerY + Math.sin(angle) * entityRadius
      };
    });

    return;
  }

  const radius =
    Math.max(
      220,
      Math.min(
        460,
        130 + neighbors.length * 34
      )
    );

  neighbors.forEach((node, index) => {
    if (localGraphPositions[node.id]) {
      return;
    }

    const angle =
      (Math.PI * 2 * index) /
      Math.max(1, neighbors.length);

    localGraphPositions[node.id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });
}

async function buildRelationshipDashboardData() {
  const docs =
    documentsCache.length
      ? documentsCache
      : await NaviStorage.getAllDocuments();

  const explicitRelationships =
    await getRelationships();

  const collections =
    await getCollections();

  const docConnectionCounts =
    new Map();

  docs.forEach(doc => {
    docConnectionCounts.set(doc.id, 0);
  });

  explicitRelationships.forEach(rel => {
    if (
      rel.sourceEntityType === 'document' &&
      docConnectionCounts.has(rel.sourceEntityId)
    ) {
      docConnectionCounts.set(
        rel.sourceEntityId,
        docConnectionCounts.get(rel.sourceEntityId) + 1
      );
    }

    if (
      rel.targetEntityType === 'document' &&
      docConnectionCounts.has(rel.targetEntityId)
    ) {
      docConnectionCounts.set(
        rel.targetEntityId,
        docConnectionCounts.get(rel.targetEntityId) + 1
      );
    }
  });

  const relationshipTypeCounts =
    new Map();

  explicitRelationships.forEach(rel => {
    const type =
      rel.relationType || 'related';

    relationshipTypeCounts.set(
      type,
      (relationshipTypeCounts.get(type) || 0) + 1
    );
  });

  const collectionImplicitCount =
    collections.reduce((total, collection) => {
      return total + (
        Array.isArray(collection.documentIds)
          ? collection.documentIds.length
          : 0
      );
    }, 0);

  const folderImplicitCount =
    docs.filter(doc => {
      const folder =
        getDocumentFolderName(doc);

      return folder && folder !== 'Unfiled';
    }).length;

  const sourceImplicitCount =
    docs.reduce((total, doc) => {
      return total + getCurrentSourceList(doc).length;
    }, 0);

  const tagImplicitCount =
    docs.reduce((total, doc) => {
      return total + (
        Array.isArray(doc.tags)
          ? doc.tags.filter(Boolean).length
          : 0
      );
    }, 0);

  const mostConnectedDocs =
    docs
      .map(doc => {
        return {
          doc,
          count:
            docConnectionCounts.get(doc.id) || 0
        };
      })
      .filter(item => item.count > 0)
      .sort((a, b) => {
        return b.count - a.count;
      })
      .slice(0, 8);

  const orphanDocs =
    docs
      .filter(doc => {
        return (docConnectionCounts.get(doc.id) || 0) === 0;
      })
      .slice(0, 10);

  const brokenRelationships = [];

  for (const rel of explicitRelationships) {
    const source =
      await resolveEntity(
        rel.sourceEntityType,
        rel.sourceEntityId
      );

    const target =
      await resolveEntity(
        rel.targetEntityType,
        rel.targetEntityId
      );

    if (!source || !target) {
      brokenRelationships.push({
        relationship: rel,
        missingSource: !source,
        missingTarget: !target
      });
    }
  }

  const recentRelationships =
    explicitRelationships
      .slice()
      .sort((a, b) => {
        return Number(b.updatedAt || b.createdAt || 0) -
          Number(a.updatedAt || a.createdAt || 0);
      })
      .slice(0, 8);

  return {
    docs,
    explicitRelationships,
    relationshipTypeCounts,
    collectionImplicitCount,
    folderImplicitCount,
    sourceImplicitCount,
    tagImplicitCount,
    mostConnectedDocs,
    orphanDocs,
    brokenRelationships,
    recentRelationships
  };
}

function renderDashboardStatCard(label, value, note = '') {
  return `
    <article class="relationship-dashboard-stat">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
      ${
        note
          ? `<small>${escapeHtml(note)}</small>`
          : ''
      }
    </article>
  `;
}

function renderDashboardSection(title, bodyHtml) {
  return `
    <section class="relationship-dashboard-section">
      <h4>${escapeHtml(title)}</h4>
      ${bodyHtml}
    </section>
  `;
}

async function renderRelationshipDashboard() {
  if (!els.relationshipDashboardBody) {
    return;
  }

  const data =
    await buildRelationshipDashboardData();

  const implicitTotal =
    data.collectionImplicitCount +
    data.folderImplicitCount +
    data.sourceImplicitCount +
    data.tagImplicitCount;

  if (els.relationshipDashboardSubtitle) {
    els.relationshipDashboardSubtitle.textContent =
      `${data.explicitRelationships.length} explicit · ${implicitTotal} implicit relationship${implicitTotal === 1 ? '' : 's'}`;
  }

  const typeRows =
    Array.from(data.relationshipTypeCounts.entries())
      .sort((a, b) => {
        return b[1] - a[1];
      })
      .map(([type, count]) => {
        return `
          <div class="relationship-dashboard-row">
            <span class="relationship-type-pill">
              ${escapeHtml(type)}
            </span>
            <strong>${count}</strong>
          </div>
        `;
      })
      .join('');

  const connectedRows =
    data.mostConnectedDocs.length
      ? data.mostConnectedDocs
          .map(item => {
            return `
              <button
                type="button"
                class="relationship-dashboard-link-row"
                data-relationship-entity-type="document"
                data-relationship-entity-id="${escapeHtml(item.doc.id)}"
              >
                <span>
                  ${escapeHtml(getDocumentTypeIcon(item.doc))}
                </span>

                <strong>
                  ${escapeHtml(item.doc.title || 'Untitled Document')}
                </strong>

                <em>${item.count} link${item.count === 1 ? '' : 's'}</em>
              </button>
            `;
          })
          .join('')
      : '<div class="empty-note">No connected documents yet.</div>';

  const orphanRows =
    data.orphanDocs.length
      ? data.orphanDocs
          .map(doc => {
            return `
              <button
                type="button"
                class="relationship-dashboard-link-row muted"
                data-relationship-entity-type="document"
                data-relationship-entity-id="${escapeHtml(doc.id)}"
              >
                <span>
                  ${escapeHtml(getDocumentTypeIcon(doc))}
                </span>

                <strong>
                  ${escapeHtml(doc.title || 'Untitled Document')}
                </strong>

                <em>No explicit links</em>
              </button>
            `;
          })
          .join('')
      : '<div class="empty-note">No orphan documents. Fancy. Suspiciously organized. ✨</div>';

  const brokenRows =
    data.brokenRelationships.length
      ? data.brokenRelationships
          .map(item => {
            const rel =
              item.relationship;

            return `
              <div class="relationship-dashboard-warning-row">
                <strong>
                  ${escapeHtml(rel.relationType || 'related')}
                </strong>

                <span>
                  ${
                    item.missingSource
                      ? 'Missing source'
                      : ''
                  }
                  ${
                    item.missingSource && item.missingTarget
                      ? ' · '
                      : ''
                  }
                  ${
                    item.missingTarget
                      ? 'Missing target'
                      : ''
                  }
                </span>
              </div>
            `;
          })
          .join('')
      : '<div class="empty-note">No broken explicit relationships found.</div>';

  let recentRows = '';

  for (const rel of data.recentRelationships) {
    const sourceName =
      await getEntityName(
        rel.sourceEntityType,
        rel.sourceEntityId
      );

    const targetName =
      await getEntityName(
        rel.targetEntityType,
        rel.targetEntityId
      );

    recentRows += `
      <div class="relationship-dashboard-recent-row">
        <button
          type="button"
          class="relationship-dashboard-mini-link"
          data-relationship-entity-type="${escapeHtml(rel.sourceEntityType)}"
          data-relationship-entity-id="${escapeHtml(rel.sourceEntityId)}"
        >
          ${escapeHtml(sourceName)}
        </button>

        <span class="relationship-type-pill">
          ${escapeHtml(rel.relationType || 'related')}
        </span>

        <button
          type="button"
          class="relationship-dashboard-mini-link"
          data-relationship-entity-type="${escapeHtml(rel.targetEntityType)}"
          data-relationship-entity-id="${escapeHtml(rel.targetEntityId)}"
        >
          ${escapeHtml(targetName)}
        </button>
      </div>
    `;
  }

  if (!recentRows) {
    recentRows =
      '<div class="empty-note">No explicit relationships yet.</div>';
  }

  els.relationshipDashboardBody.innerHTML = `
    <div class="relationship-dashboard-stats">
      ${renderDashboardStatCard(
        'Explicit',
        data.explicitRelationships.length,
        'Saved links'
      )}

      ${renderDashboardStatCard(
        'Collections',
        data.collectionImplicitCount,
        'Implicit'
      )}

      ${renderDashboardStatCard(
        'Folders',
        data.folderImplicitCount,
        'Implicit'
      )}

      ${renderDashboardStatCard(
        'Sources',
        data.sourceImplicitCount,
        'Implicit'
      )}

      ${renderDashboardStatCard(
        'Tags',
        data.tagImplicitCount,
        'Implicit'
      )}

      ${renderDashboardStatCard(
        'Broken',
        data.brokenRelationships.length,
        'Needs attention'
      )}
    </div>

    <div class="relationship-dashboard-grid">
      ${renderDashboardSection(
        'Relationship Types',
        typeRows || '<div class="empty-note">No explicit relationship types yet.</div>'
      )}

      ${renderDashboardSection(
        'Most Connected Documents',
        connectedRows
      )}

      ${renderDashboardSection(
        'Orphan Documents',
        orphanRows
      )}

      ${renderDashboardSection(
        'Broken Links',
        brokenRows
      )}

      ${renderDashboardSection(
        'Recent Explicit Relationships',
        recentRows
      )}
    </div>
  `;

  wireRelationshipEntityLinks(
    els.relationshipDashboardBody
  );
}

async function openRelationshipDashboardModal() {
  if (!els.relationshipDashboardModal) {
    return;
  }

  els.relationshipDashboardModal.classList.remove('hidden');

  await renderRelationshipDashboard();
}

function closeRelationshipDashboardModal() {
  if (els.relationshipDashboardModal) {
    els.relationshipDashboardModal.classList.add('hidden');
  }
}

function getSelectedLocalGraphNode() {
  if (!localGraphSelectedNodeId) {
    return null;
  }

  return localGraphData.nodes.find(node => {
    return node.id === localGraphSelectedNodeId;
  }) || null;
}

function getLocalGraphEdgesForNode(nodeId) {
  if (!nodeId) {
    return [];
  }

  return localGraphData.edges.filter(edge => {
    return (
      edge.sourceNodeId === nodeId ||
      edge.targetNodeId === nodeId
    );
  });
}

function getOtherLocalGraphNode(edge, nodeId) {
  const otherNodeId =
    edge.sourceNodeId === nodeId
      ? edge.targetNodeId
      : edge.sourceNodeId;

  return localGraphData.nodes.find(node => {
    return node.id === otherNodeId;
  }) || null;
}

function selectLocalGraphNode(nodeId) {
  localGraphSelectedNodeId =
    nodeId || null;

  renderLocalGraph();
}

function closeAllTopMenus() {
  document
    .querySelectorAll('.top-menu[open]')
    .forEach(menu => {
      menu.removeAttribute('open');
    });
}

function clearLocalGraphSelection() {
  localGraphSelectedNodeId = null;

  if (els.localGraphDetailsPanel) {
    els.localGraphDetailsPanel.classList.add('hidden');
  }

  renderLocalGraphEdges();
  renderLocalGraphNodes();
}

function getLocalGraphNodePosition(nodeId) {
  return (
    localGraphPositions[nodeId] || {
      x: 1000,
      y: 700
    }
  );
}

function setLocalGraphNodePosition(nodeId, x, y) {
  localGraphPositions[nodeId] = {
    x,
    y
  };
}

function updateLocalGraphTransform() {
  if (!els.localGraphViewport) {
    return;
  }

  els.localGraphViewport.style.transform =
    `translate(${localGraphPan.x}px, ${localGraphPan.y}px) scale(${localGraphZoom})`;

  if (els.localGraphZoomLabel) {
    els.localGraphZoomLabel.textContent =
      `${Math.round(localGraphZoom * 100)}%`;
  }
  updateLocalGraphMinimapViewport();
}

function screenToLocalGraphPoint(clientX, clientY) {
  const rect =
    els.localGraphSurface.getBoundingClientRect();

  return {
    x:
      (clientX - rect.left - localGraphPan.x) /
      localGraphZoom,

    y:
      (clientY - rect.top - localGraphPan.y) /
      localGraphZoom
  };
}

function clampLocalGraphZoom(value) {
  return Math.max(
    0.35,
    Math.min(
      2.5,
      value
    )
  );
}

function getLocalGraphEdgeGroupKey(edge) {
  return [
    edge.sourceNodeId,
    edge.targetNodeId
  ]
    .sort()
    .join('::');
}

function getLocalGraphEdgeGroupKey(edge) {
  return [
    edge.sourceNodeId,
    edge.targetNodeId
  ]
    .sort()
    .join('::');
}

function getBundledRelationshipLabel(edges = []) {
  const labels =
    Array.from(
      new Set(
        edges
          .map(edge => edge.relationType || 'related')
          .filter(Boolean)
      )
    );

  if (!labels.length) {
    return 'related';
  }

  if (labels.length <= 3) {
    return labels.join(' · ');
  }

  return `${labels.slice(0, 3).join(' · ')} +${labels.length - 3}`;
}

function renderLocalGraphEdges() {
  if (!els.localGraphEdges) {
    return;
  }

  els.localGraphEdges.innerHTML = '';

  const edgeGroups =
    new Map();

  localGraphData.edges.forEach(edge => {
    const key =
      getLocalGraphEdgeGroupKey(edge);

    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }

    edgeGroups.get(key).push(edge);
  });

  edgeGroups.forEach(groupEdges => {
    const firstEdge =
      groupEdges[0];

    const source =
      getLocalGraphNodePosition(
        firstEdge.sourceNodeId
      );

    const target =
      getLocalGraphNodePosition(
        firstEdge.targetNodeId
      );

    const dx =
      target.x - source.x;

    const dy =
      target.y - source.y;

    const length =
      Math.max(
        1,
        Math.hypot(dx, dy)
      );

    const normalX =
      -dy / length;

    const normalY =
      dx / length;

    /*
      If this bundle contains multiple relationships,
      give the curve a bigger bend so the label does not sit
      directly on top of the straight edge.
    */
    const bundleOffset =
      groupEdges.length > 1
        ? 46
        : 0;

    const midX =
      (source.x + target.x) / 2;

    const midY =
      (source.y + target.y) / 2;

    const controlX =
      midX + normalX * bundleOffset;

    const controlY =
      midY + normalY * bundleOffset;

    const path =
      document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );

    path.setAttribute(
      'd',
      `
        M ${source.x} ${source.y}
        Q ${controlX} ${controlY}
          ${target.x} ${target.y}
      `
    );

    path.classList.add(
      'local-graph-edge'
    );
    
    if (
  groupEdges.some(edge => {
    return isLocalGraphEdgeConnectedToSelected(edge);
  })
) {
  path.classList.add('selected');
}

    const allImplicit =
      groupEdges.every(edge => edge.isImplicit);

    const hasImplicit =
      groupEdges.some(edge => edge.isImplicit);

    const hasExplicit =
      groupEdges.some(edge => !edge.isImplicit);

    if (allImplicit) {
      path.classList.add('implicit');
    }

    if (hasImplicit && hasExplicit) {
      path.classList.add('mixed');
    }

    const strongest =
      Math.max(
        ...groupEdges.map(edge => {
          return Number(edge.strength || 1) || 1;
        })
      );

    path.setAttribute(
      'stroke-width',
      String(
        Math.max(
          1.5,
          Math.min(
            4,
            strongest
          )
        )
      )
    );

    path.setAttribute('fill', 'none');

    els.localGraphEdges.appendChild(path);

    const label =
      document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );

    /*
      Push label slightly farther off the line than the control point.
      This is the part that stops it from sitting directly on the edge.
    */
    label.setAttribute(
      'x',
      controlX + normalX * 12
    );

    label.setAttribute(
      'y',
      controlY + normalY * 12 - 8
    );

    label.setAttribute(
      'text-anchor',
      'middle'
    );

    label.classList.add(
      'local-graph-edge-label'
    );
    
    if (
  groupEdges.some(edge => {
    return isLocalGraphEdgeConnectedToSelected(edge);
  })
) {
  label.classList.add('selected');
}

    if (allImplicit) {
      label.classList.add('implicit');
    }

    if (hasImplicit && hasExplicit) {
      label.classList.add('mixed');
    }

    label.textContent =
      getBundledRelationshipLabel(groupEdges);

    els.localGraphEdges.appendChild(label);
  });
}

function renderLocalGraphNodes() {
  if (!els.localGraphNodes) {
    return;
  }

  els.localGraphNodes.innerHTML = '';

  localGraphData.nodes.forEach(node => {
    const position =
      getLocalGraphNodePosition(node.id);

    const button =
      document.createElement('button');

    button.type = 'button';

    button.className = [
  'local-graph-node',
  node.isCurrent ? 'current' : '',
  node.id === localGraphSelectedNodeId ? 'selected' : '',
  isLocalGraphNodeNeighborOfSelected(node.id) ? 'neighbor' : '',
  localGraphSelectedNodeId &&
    node.id !== localGraphSelectedNodeId &&
    !isLocalGraphNodeNeighborOfSelected(node.id)
      ? 'dimmed'
      : '',
  `entity-${node.entityType}`
]
  .filter(Boolean)
  .join(' ');

    button.dataset.nodeId =
      node.id;

    button.dataset.relationshipEntityType =
      node.entityType;

    button.dataset.relationshipEntityId =
      node.entityId;

    button.style.left =
      `${position.x}px`;

    button.style.top =
      `${position.y}px`;

    button.innerHTML = `
      <span class="local-graph-node-icon">
        ${escapeHtml(getRelationshipEntityIcon(node.entityType))}
      </span>

      <span class="local-graph-node-label">
        ${escapeHtml(node.label || 'Untitled')}
      </span>

      <span class="local-graph-node-type">
        ${escapeHtml(getRelationshipEntityLabel(node.entityType))}
      </span>
    `;

    button.addEventListener(
      'pointerdown',
      event => {
        event.stopPropagation();

        const point =
          screenToLocalGraphPoint(
            event.clientX,
            event.clientY
          );

        const currentPosition =
          getLocalGraphNodePosition(node.id);

        localGraphDragNodeId =
          node.id;
        
        localGraphNodeDragStart = {
  x: event.clientX,
  y: event.clientY
};

localGraphSuppressNextNodeClick = false;

        localGraphDragOffset = {
          x: point.x - currentPosition.x,
          y: point.y - currentPosition.y
        };

        button.setPointerCapture(
          event.pointerId
        );
      }
    );

button.addEventListener(
  'click',
  event => {
    if (localGraphSuppressNextNodeClick) {
      localGraphSuppressNextNodeClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.stopPropagation();

    selectLocalGraphNode(node.id);
  }
);
    
   button.addEventListener(
  'dblclick',
  async event => {
    event.preventDefault();
    event.stopPropagation();

    if (node.isCurrent) {
      closeLocalGraphModal();
      return;
    }

    const entityType =
      node.entityType;

    const entityId =
      node.entityId;

    closeLocalGraphModal();

    await openRelationshipEntity(
      entityType,
      entityId,
      {
        suppressNotice: false
      }
    );
  }
);

    els.localGraphNodes.appendChild(button);
  });
}

function centerLocalGraphOnNode(nodeId) {
  if (!els.localGraphSurface || !nodeId) {
    return;
  }

  const position =
    getLocalGraphNodePosition(nodeId);

  const rect =
    els.localGraphSurface.getBoundingClientRect();

  localGraphPan = {
    x:
      rect.width / 2 -
      position.x * localGraphZoom,

    y:
      rect.height / 2 -
      position.y * localGraphZoom
  };

  updateLocalGraphTransform();
}

async function openSelectedLocalGraphNode() {
  const node =
    getSelectedLocalGraphNode();

  if (!node) {
    return;
  }

  if (node.isCurrent) {
    closeLocalGraphModal();
    return;
  }

  const entityType =
    node.entityType;

  const entityId =
    node.entityId;

  closeLocalGraphModal();

  await openRelationshipEntity(
    entityType,
    entityId,
    {
      suppressNotice: false
    }
  );
}

function getLocalGraphFilterState() {
  return {
    explicit:
      els.localGraphShowExplicit?.checked !== false,

    collections:
      Boolean(
        els.localGraphShowCollections?.checked
      ),

    folders:
      Boolean(
        els.localGraphShowFolders?.checked
      ),

    sources:
      Boolean(
        els.localGraphShowSources?.checked
      ),

    tags:
      Boolean(
        els.localGraphShowTags?.checked
      )
  };
}

function renderLocalGraph() {
  renderLocalGraphEdges();
  renderLocalGraphNodes();
  renderLocalGraphDetails();
  renderLocalGraphMinimap();
  updateLocalGraphTransform();

  if (els.localGraphSubtitle) {
    const nodeCount =
      localGraphData.nodes.length;

    const edgeCount =
      localGraphData.edges.length;

    els.localGraphSubtitle.textContent =
  `${localGraphMode === 'global' ? 'Project-wide' : 'Local'} · ${nodeCount} node${nodeCount === 1 ? '' : 's'} · ${edgeCount} relationship${edgeCount === 1 ? '' : 's'}`;
  }
}

function renderLocalGraphDetails() {
  if (
    !els.localGraphDetailsPanel ||
    !els.localGraphDetailsTitle ||
    !els.localGraphDetailsMeta ||
    !els.localGraphDetailsBody
  ) {
    return;
  }

  const node =
    getSelectedLocalGraphNode();

  if (!node) {
    els.localGraphDetailsPanel.classList.add('hidden');
    return;
  }

  const connectedEdges =
    getLocalGraphEdgesForNode(node.id);

  els.localGraphDetailsPanel.classList.remove('hidden');

  els.localGraphDetailsTitle.textContent =
    node.label || 'Untitled';

  els.localGraphDetailsMeta.textContent =
    `${getRelationshipEntityLabel(node.entityType)} · ${connectedEdges.length} connection${connectedEdges.length === 1 ? '' : 's'}`;

  if (!connectedEdges.length) {
    els.localGraphDetailsBody.innerHTML =
      '<div class="empty-note">No connected relationships.</div>';
    return;
  }

  let html = '';

  connectedEdges.forEach(edge => {
    const otherNode =
      getOtherLocalGraphNode(
        edge,
        node.id
      );

    const direction =
      edge.sourceNodeId === node.id
        ? 'outgoing'
        : 'incoming';

    html += `
      <div class="local-graph-detail-relationship">
        <div class="local-graph-detail-main">
          <span class="relationship-type-pill">
            ${escapeHtml(edge.relationType || 'related')}
          </span>

          <span class="outliner-muted">
            ${escapeHtml(direction)}
          </span>
        </div>

        <button
          type="button"
          class="local-graph-detail-node-link"
          data-local-graph-select-node="${escapeHtml(otherNode?.id || '')}"
        >
          <span>
            ${escapeHtml(getRelationshipEntityIcon(otherNode?.entityType || ''))}
          </span>

          <strong>
            ${escapeHtml(otherNode?.label || 'Missing Item')}
          </strong>
        </button>

        ${
          edge.note
            ? `<div class="local-graph-detail-note">${escapeHtml(edge.note)}</div>`
            : ''
        }

        ${
          edge.isImplicit
            ? '<div class="relationship-implicit-badge">Implicit</div>'
            : ''
        }
      </div>
    `;
  });

  els.localGraphDetailsBody.innerHTML =
    html;

  els.localGraphDetailsBody
    .querySelectorAll('[data-local-graph-select-node]')
    .forEach(button => {
      button.addEventListener('click', event => {
        const nodeId =
          event.currentTarget.dataset.localGraphSelectNode;

        if (!nodeId) {
          return;
        }

        selectLocalGraphNode(nodeId);
        centerLocalGraphOnNode(nodeId);
      });
    });
}

function isLocalGraphEdgeConnectedToSelected(edge) {
  if (!localGraphSelectedNodeId) {
    return false;
  }

  return (
    edge.sourceNodeId === localGraphSelectedNodeId ||
    edge.targetNodeId === localGraphSelectedNodeId
  );
}

function isLocalGraphNodeNeighborOfSelected(nodeId) {
  if (!localGraphSelectedNodeId || nodeId === localGraphSelectedNodeId) {
    return false;
  }

  return localGraphData.edges.some(edge => {
    return (
      edge.sourceNodeId === localGraphSelectedNodeId &&
      edge.targetNodeId === nodeId
    ) || (
      edge.targetNodeId === localGraphSelectedNodeId &&
      edge.sourceNodeId === nodeId
    );
  });
}

function getLocalGraphBounds() {
  const nodes =
    localGraphData.nodes || [];

  if (!nodes.length) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach(node => {
    const pos =
      getLocalGraphNodePosition(
        node.id
      );

    minX =
      Math.min(minX, pos.x);

    minY =
      Math.min(minY, pos.y);

    maxX =
      Math.max(maxX, pos.x);

    maxY =
      Math.max(maxY, pos.y);
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width:
      Math.max(1, maxX - minX),

    height:
      Math.max(1, maxY - minY),

    centerX:
      (minX + maxX) / 2,

    centerY:
      (minY + maxY) / 2
  };
}

function fitLocalGraphToView() {
  if (!els.localGraphSurface) {
    return;
  }

  const bounds =
    getLocalGraphBounds();

  if (!bounds) {
    return;
  }

  const rect =
    els.localGraphSurface.getBoundingClientRect();

  const padding =
    220;

  const fitZoomX =
    rect.width / (bounds.width + padding);

  const fitZoomY =
    rect.height / (bounds.height + padding);

  localGraphZoom =
    clampLocalGraphZoom(
      Math.min(
        1,
        fitZoomX,
        fitZoomY
      )
    );

  localGraphPan = {
    x:
      rect.width / 2 -
      bounds.centerX * localGraphZoom,

    y:
      rect.height / 2 -
      bounds.centerY * localGraphZoom
  };

  updateLocalGraphTransform();
}

function zoomLocalGraph(delta) {
  localGraphZoom =
    clampLocalGraphZoom(
      localGraphZoom + delta
    );

  updateLocalGraphTransform();
}

async function openGlobalGraphModal() {
  if (!els.localGraphModal) {
    return;
  }

  localGraphMode = 'global';

  resetLocalGraphState();

  if (els.localGraphShowExplicit) {
    els.localGraphShowExplicit.checked = true;
  }

  localGraphData =
    await buildGlobalGraphData();

  autoLayoutLocalGraph();

  if (els.localGraphTitle) {
    els.localGraphTitle.textContent =
      'Global Graph';
  }

  if (els.localGraphModal) {
    els.localGraphModal.classList.add(
      'global-graph-mode'
    );
  }

  els.localGraphModal.classList.remove(
    'hidden'
  );

  renderLocalGraph();

  requestAnimationFrame(() => {
    fitLocalGraphToView();
  });
}

async function openLocalGraphModal() {
  if (!currentDocumentId) {
    showAppNotice(
      'Open a document first.',
      'No document selected'
    );
    return;
  }

  if (!els.localGraphModal) {
    return;
  }
  
  localGraphMode = 'local';

resetLocalGraphState();

if (els.localGraphShowExplicit) {
  els.localGraphShowExplicit.checked = true;
}

localGraphData =
  await buildLocalGraphData(
    currentDocumentId
  );

autoLayoutLocalGraph();
  
  if (els.localGraphTitle) {
  els.localGraphTitle.textContent =
    'Local Graph';
}

if (els.localGraphModal) {
  els.localGraphModal.classList.remove(
    'global-graph-mode'
  );
}

els.localGraphModal.classList.remove(
  'hidden'
);

renderLocalGraph();
  
  requestAnimationFrame(() => {
  fitLocalGraphToView();
});
  
}

function closeLocalGraphModal() {
  if (els.localGraphModal) {
    els.localGraphModal.classList.add(
      'hidden'
    );

    els.localGraphModal.classList.remove(
      'global-graph-mode'
    );
  }

  if (els.localGraphDetailsPanel) {
    els.localGraphDetailsPanel.classList.add(
      'hidden'
    );
  }

  localGraphMode = 'local';
  localGraphDragNodeId = null;
  localGraphIsPanning = false;
  localGraphSelectedNodeId = null;
}

function setupLocalGraphInteractions() {
  if (!els.localGraphSurface) {
    return;
  }

  els.localGraphSurface.addEventListener(
    'pointerdown',
    event => {
      if (
  event.target.closest('.local-graph-node') ||
  event.target.closest('.local-graph-details-panel') ||
  event.target.closest('.local-graph-minimap')
) {
  return;
}

      localGraphIsPanning = true;

      localGraphPanStart = {
        x: event.clientX - localGraphPan.x,
        y: event.clientY - localGraphPan.y
      };

      els.localGraphSurface.setPointerCapture(
        event.pointerId
      );
    }
  );

  els.localGraphSurface.addEventListener(
    'pointermove',
    event => {
      if (localGraphDragNodeId) {
        
        const dragDx =
  event.clientX - localGraphNodeDragStart.x;

const dragDy =
  event.clientY - localGraphNodeDragStart.y;

if (
  Math.hypot(dragDx, dragDy) > 6
) {
  localGraphSuppressNextNodeClick = true;
}
        
        const point =
          screenToLocalGraphPoint(
            event.clientX,
            event.clientY
          );

        setLocalGraphNodePosition(
          localGraphDragNodeId,
          point.x - localGraphDragOffset.x,
          point.y - localGraphDragOffset.y
        );

        renderLocalGraphEdges();

        const nodeEl =
          els.localGraphNodes
            ?.querySelector(
              `[data-node-id="${CSS.escape(localGraphDragNodeId)}"]`
            );

        const position =
          getLocalGraphNodePosition(
            localGraphDragNodeId
          );

        if (nodeEl) {
          nodeEl.style.left =
            `${position.x}px`;

          nodeEl.style.top =
            `${position.y}px`;
        }

        return;
      }

      if (localGraphIsPanning) {
        localGraphPan = {
          x: event.clientX - localGraphPanStart.x,
          y: event.clientY - localGraphPanStart.y
        };

        updateLocalGraphTransform();
      }
    }
  );

  els.localGraphSurface.addEventListener(
    'pointerup',
    event => {
      localGraphDragNodeId = null;
      localGraphIsPanning = false;

      try {
        els.localGraphSurface.releasePointerCapture(
          event.pointerId
        );
      } catch {}
    }
  );

  els.localGraphSurface.addEventListener(
    'wheel',
    event => {
      event.preventDefault();

      const delta =
        event.deltaY > 0
          ? -0.08
          : 0.08;

      zoomLocalGraph(delta);
    },
    {
      passive: false
    }
  );
}

async function renderOutgoingRelationships(docId) {
  if (!els.relationshipOutgoing) {
    return;
  }

  const relationships =
    await getRelationshipsForEntity(
      'document',
      docId
    );

  if (!relationships.length) {
    els.relationshipOutgoing.innerHTML =
      '<div class="empty-note relationship-empty">No relationships.</div>';
    return;
  }

  let html = '';

  for (const rel of relationships) {
    const targetName =
      await getEntityName(
        rel.targetEntityType,
        rel.targetEntityId
      );

    html += `
      <div class="relationship-item">
        <div class="relationship-main">
          <span class="relationship-type-pill">
            ${escapeHtml(rel.relationType || 'related')}
          </span>

          <span class="relationship-arrow">→</span>

          <button
  type="button"
  class="relationship-entity-link relationship-target"
  data-relationship-entity-type="${escapeHtml(rel.targetEntityType)}"
  data-relationship-entity-id="${escapeHtml(rel.targetEntityId)}"
  title="Open linked ${escapeHtml(getRelationshipEntityLabel(rel.targetEntityType))}"
>
  ${escapeHtml(targetName)}
</button>
        </div>

        <div class="relationship-meta">
          <span
            class="relationship-strength"
            title="${escapeHtml(getRelationshipStrengthLabel(rel.strength))}"
          >
            ${escapeHtml(getRelationshipStrengthStars(rel.strength))}
          </span>

          <button
            type="button"
            class="relationship-delete-btn"
            data-relationship-id="${escapeHtml(rel.id)}"
            title="Delete relationship"
          >
            ×
          </button>
        </div>

        ${
          rel.note
            ? `<div class="relationship-note">${escapeHtml(rel.note)}</div>`
            : ''
        }
      </div>
    `;
  }

  els.relationshipOutgoing.innerHTML =
    html;
  
  wireRelationshipEntityLinks(
  els.relationshipOutgoing
);

  els.relationshipOutgoing
    .querySelectorAll('[data-relationship-id]')
    .forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();

        await deleteRelationship(
          event.currentTarget.dataset.relationshipId
        );

        relationshipsCache =
          await getRelationships();

        await renderRelationshipPanel(docId);

        NaviEditor.setSaveStatus('Relationship deleted');
      });
    });
}

async function renderBacklinks(docId) {
  if (!els.relationshipBacklinks) {
    return;
  }

  const backlinks =
    await getBacklinksForEntity(
      'document',
      docId
    );

  if (!backlinks.length) {
    els.relationshipBacklinks.innerHTML =
      '<div class="empty-note relationship-empty">No references.</div>';
    return;
  }

  let html = '';

  for (const rel of backlinks) {
    const sourceName =
      await getEntityName(
        rel.sourceEntityType,
        rel.sourceEntityId
      );

    html += `
      <div class="relationship-item backlink-item">
        <div class="relationship-main">
          <button
  type="button"
  class="relationship-entity-link relationship-source"
  data-relationship-entity-type="${escapeHtml(rel.sourceEntityType)}"
  data-relationship-entity-id="${escapeHtml(rel.sourceEntityId)}"
  title="Open linked ${escapeHtml(getRelationshipEntityLabel(rel.sourceEntityType))}"
>
  ${escapeHtml(sourceName)}
</button>

          <span class="relationship-arrow">→</span>

          <span class="relationship-type-pill">
            ${escapeHtml(rel.relationType || 'related')}
          </span>

          <span class="relationship-arrow">→</span>

          <span class="relationship-target">
            this
          </span>
        </div>

        <div class="relationship-meta">
          <span
            class="relationship-strength"
            title="${escapeHtml(getRelationshipStrengthLabel(rel.strength))}"
          >
            ${escapeHtml(getRelationshipStrengthStars(rel.strength))}
          </span>

          <button
            type="button"
            class="relationship-delete-btn"
            data-relationship-id="${escapeHtml(rel.id)}"
            title="Delete relationship"
          >
            ×
          </button>
        </div>

        ${
          rel.note
            ? `<div class="relationship-note">${escapeHtml(rel.note)}</div>`
            : ''
        }
      </div>
    `;
  }

  els.relationshipBacklinks.innerHTML =
    html;
  
  wireRelationshipEntityLinks(
  els.relationshipBacklinks
);

  els.relationshipBacklinks
    .querySelectorAll('[data-relationship-id]')
    .forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();

        await deleteRelationship(
          event.currentTarget.dataset.relationshipId
        );

        relationshipsCache =
          await getRelationships();

        await renderRelationshipPanel(docId);

        NaviEditor.setSaveStatus('Relationship deleted');
      });
    });
}

function safeFileName(name) {
  return String(name || 'Untitled Document')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Untitled Document';
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown date';

  const date = new Date(timestamp);

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function getOrderedManuscriptDocs(rootDoc) {
  const allDocs = await NaviStorage.getAllDocuments();

  const children = allDocs.filter(doc => doc.parentId === rootDoc.id);

  const orderedChildren = children.slice().sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : null;
    const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : null;

    if (orderA !== null && orderB !== null) {
      return orderA - orderB;
    }

    const chapterA = getChapterNumberFromTitle(a.title);
    const chapterB = getChapterNumberFromTitle(b.title);

    if (chapterA !== null && chapterB !== null) {
      return chapterA - chapterB;
    }

    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  return [
    rootDoc,
    ...orderedChildren.filter(doc => doc.docType === 'chapter'),
    ...orderedChildren.filter(doc => doc.docType !== 'chapter')
  ];
}

function getActiveCollectionFromCache() {
  return getCollectionById(collectionsCache, activeCollectionId);
}

function docMatchesCollectionPickerSearch(doc, query = '') {
  const needle =
    String(query || '').trim().toLowerCase();

  if (!needle) return true;

  const haystack = [
    doc.title,
    doc.docType,
    doc.folder,
    doc.status,
    doc.pov,
    doc.location,
    doc.timeline,
    doc.characters,
    doc.summary,
    Array.isArray(doc.tags) ? doc.tags.join(', ') : ''
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

function renderCollectionDocPickerList() {
  if (!els.collectionDocPickerList) return;

  const collection =
    getActiveCollectionFromCache();

  if (!collection) {
    els.collectionDocPickerList.innerHTML =
      '<div class="empty-note">Choose a collection first.</div>';
    return;
  }

  const query =
    els.collectionDocPickerSearch?.value || '';

  const typeFilter =
    els.collectionDocPickerTypeFilter?.value || '';

  const existingIds =
    new Set(collection.documentIds || []);

  const docs =
    documentsCache
      .filter(doc => {
        if (existingIds.has(doc.id)) return false;

        if (typeFilter && (doc.docType || 'general') !== typeFilter) {
          return false;
        }

        return docMatchesCollectionPickerSearch(doc, query);
      })
      .sort((a, b) => {
        return String(a.title || '').localeCompare(String(b.title || ''));
      });

  if (!docs.length) {
    els.collectionDocPickerList.innerHTML =
      '<div class="empty-note">No matching documents to add.</div>';
    return;
  }

  els.collectionDocPickerList.innerHTML = '';

  docs.forEach(doc => {
    const row =
      document.createElement('label');

    row.className = 'collection-picker-row';

    const checked =
      pendingCollectionPickerSelectedIds.has(doc.id);

    row.innerHTML = `
      <input
        type="checkbox"
        value="${escapeHtml(doc.id)}"
        ${checked ? 'checked' : ''}
      />

      <span class="collection-picker-doc-icon">
        ${escapeHtml(getDocumentTypeIcon(doc))}
      </span>

      <span class="collection-picker-doc-main">
        <strong>${escapeHtml(doc.title || 'Untitled Document')}</strong>
        <span>
          ${escapeHtml(getReadableDocType(doc))}
          • ${Number(doc.wordCount || 0).toLocaleString()} words
          ${
            doc.folder
              ? ` • 📁 ${escapeHtml(doc.folder)}`
              : ''
          }
        </span>
      </span>
    `;

    row.querySelector('input')?.addEventListener('change', event => {
      const id =
        event.currentTarget.value;

      if (event.currentTarget.checked) {
        pendingCollectionPickerSelectedIds.add(id);
      } else {
        pendingCollectionPickerSelectedIds.delete(id);
      }
    });

    els.collectionDocPickerList.appendChild(row);
  });
}

async function openCollectionDocPicker() {
  collectionsCache =
    await getCollections();

  const collection =
    getActiveCollectionFromCache();

  if (!collection) {
    showAppNotice(
      'Choose or create a collection first.',
      'No collection selected'
    );
    return;
  }

  pendingCollectionPickerSelectedIds =
    new Set();

  if (els.collectionPickerSubtitle) {
    els.collectionPickerSubtitle.textContent =
      `Add documents to "${collection.name || 'Untitled Collection'}".`;
  }

  if (els.collectionDocPickerSearch) {
    els.collectionDocPickerSearch.value = '';
  }

  if (els.collectionDocPickerTypeFilter) {
    els.collectionDocPickerTypeFilter.value = '';
  }

  if (els.collectionsModal) {
  els.collectionsModal.classList.add('collection-picker-open');
}

if (els.collectionDocPickerModal) {
  els.collectionDocPickerModal.classList.remove('hidden');
}

  renderCollectionDocPickerList();

  setTimeout(() => {
    els.collectionDocPickerSearch?.focus();
  }, 0);
}

function closeCollectionDocPicker() {
  pendingCollectionPickerSelectedIds.clear();

 if (els.collectionDocPickerModal) {
  els.collectionDocPickerModal.classList.add('hidden');
}

if (els.collectionsModal) {
  els.collectionsModal.classList.remove('collection-picker-open');
}
}


async function submitCollectionDocPicker() {
  const selectedIds =
    Array.from(pendingCollectionPickerSelectedIds);

  if (!selectedIds.length) {
    showAppNotice(
      'Select at least one document to add.',
      'No documents selected'
    );
    return;
  }

  const collections =
    await getCollections();

  const collection =
    getCollectionById(collections, activeCollectionId);

  if (!collection) {
    showAppNotice(
      'Choose a collection first.',
      'No collection selected'
    );
    return;
  }

  const existingIds =
    new Set(collection.documentIds || []);

  selectedIds.forEach(id => {
    existingIds.add(id);
  });

  collection.documentIds =
    Array.from(existingIds);

  collection.updatedAt =
    Date.now();

  await saveCollections(collections);

  collectionsCache =
    await getCollections();

  closeCollectionDocPicker();

  await renderCollectionsModal();
  renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Documents added to collection');
}

async function loadDocuments() {
  documentsCache = await NaviStorage.getAllDocuments();
  collectionsCache = await getCollections();
  renderDocumentList(documentsCache);
  
  if (
  els.splitPane &&
  !els.splitPane.classList.contains('hidden')
) {
  populateSplitDocSelect();
}


  if (els.docCount) {
    const count = documentsCache.length;
    els.docCount.textContent = `${count} ${count === 1 ? 'doc' : 'docs'}`;
  }

  return documentsCache;
}

async function saveSplitStateForDocument(docId, splitDocId = '') {
  if (!docId) return;

  const doc =
    await NaviStorage.getDocument(docId);

  if (!doc) return;

  const updated = {
    ...doc,
    splitPaneDocId:
      splitDocId || '',
    updatedAt:
      Date.now()
  };

  const saved =
    await NaviStorage.saveDocument(updated);

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  renderDocumentList(documentsCache);
}

function isSplitOpen() {
  return Boolean(
    els.splitPane &&
    !els.splitPane.classList.contains('hidden')
  );
}

function showSplitShell() {
  if (els.workspace) {
    els.workspace.classList.add('split-active');
  }

  if (els.splitPane) {
    els.splitPane.classList.remove('hidden');
  }

  if (els.splitResizeHandle) {
    els.splitResizeHandle.classList.remove('hidden');
  }

  if (els.openSplitEditorBtn) {
    els.openSplitEditorBtn.classList.add('active');
  }
}



function hideSplitShell() {
  if (els.workspace) {
    els.workspace.classList.remove('split-active');
  }

  if (els.splitPane) {
    els.splitPane.classList.add('hidden');
  }

  if (els.splitResizeHandle) {
    els.splitResizeHandle.classList.add('hidden');
  }

  if (els.openSplitEditorBtn) {
    els.openSplitEditorBtn.classList.remove('active');
  }
}

function normalizeSourceList(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources.map(source => {
    return {
      id: source.id || crypto.randomUUID(),
      title: source.title || '',
      url: source.url || '',
      author: source.author || '',
      dateAccessed: source.dateAccessed || '',
      tags: Array.isArray(source.tags)
        ? source.tags
        : parseTags(source.tags || ''),
      notes: source.notes || '',
      createdAt: source.createdAt || Date.now(),
      updatedAt: source.updatedAt || Date.now()
    };
  });
}

function getRelationshipStrengthLabel(
  strength = 1
) {
  switch (Number(strength) || 1) {
    case 5:
      return 'Critical';

    case 4:
      return 'Strong';

    case 3:
      return 'Normal';

    case 2:
      return 'Light';

    default:
      return 'Weak';
  }
}

function getRelationshipStrengthStars(
  strength = 1
) {
  return '★'.repeat(
    Math.max(
      1,
      Math.min(
        5,
        Number(strength) || 1
      )
    )
  );
}

function getCurrentSourceList(doc) {
  return normalizeSourceList(doc?.sources || []);
}

function formatSourceDate(value) {
  if (!value) return '';

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return value;
  }
}

async function resolveEntity(type, id) {
  if (!type || !id) {
    return null;
  }

  if (type === 'document') {
    return await NaviStorage.getDocument(id);
  }

  if (type === 'collection') {
    const collections =
      await getCollections();

    return collections.find(collection => {
      return collection.id === id;
    }) || null;
  }

  if (type === 'folder') {
    const docs =
      documentsCache.length
        ? documentsCache
        : await NaviStorage.getAllDocuments();

    const folderName =
      String(id || '').trim();

    const count =
      docs.filter(doc => {
        return getDocumentFolderName(doc) === folderName;
      }).length;

    if (!folderName) {
      return null;
    }

    return {
      id: folderName,
      name: folderName,
      title: folderName,
      type: 'folder',
      count
    };
  }

  if (type === 'source') {
    const docs =
      documentsCache.length
        ? documentsCache
        : await NaviStorage.getAllDocuments();

    for (const doc of docs) {
      const sources =
        getCurrentSourceList(doc);

      const found =
        sources.find(source => {
          return getSourceEntityId(doc.id, source.id) === id;
        });

      if (found) {
        return {
          ...found,
          title: found.title || 'Untitled Source',
          parentDocumentId: doc.id,
          parentDocumentTitle: doc.title || 'Untitled Document'
        };
      }
    }

    return null;
  }
  
  if (type === 'tag') {
  const tagName =
    String(id || '').trim();

  if (!tagName) {
    return null;
  }

  return {
    id: tagName,
    name: `#${tagName}`,
    title: `#${tagName}`,
    type: 'tag'
  };
}

  return null;
}


function parseSourceEntityId(entityId = '') {
  const parts =
    String(entityId || '').split('::');

  return {
    docId: parts[0] || '',
    sourceId: parts[1] || ''
  };
}

async function openRelationshipEntity(
  entityType,
  entityId,
  options = {}
) {
  const closeOutliner =
    Boolean(options.closeOutliner);
  
  const suppressNotice =
  Boolean(options.suppressNotice);

  if (!entityType || !entityId) {
    return;
  }

  if (entityType === 'document') {
    if (
      closeOutliner &&
      typeof closeOutlinerModal === 'function'
    ) {
      closeOutlinerModal();
    }

    await openDocument(entityId);
    return;
  }

  if (entityType === 'collection') {
    activeCollectionId =
      entityId;

    if (
      closeOutliner &&
      typeof closeOutlinerModal === 'function'
    ) {
      closeOutlinerModal();
    }

    await openCollectionsModal();
    return;
  }

  if (entityType === 'folder') {
    activeFolderFilter =
      entityId;

    if (
      closeOutliner &&
      typeof closeOutlinerModal === 'function'
    ) {
      closeOutlinerModal();
    }

    renderDocumentList(
      documentsCache
    );

    showAppNotice(
      `Filtered sidebar to folder "${entityId}".`,
      'Folder opened'
    );

    return;
  }

  if (entityType === 'source') {
    const parsed =
      parseSourceEntityId(entityId);

    if (!parsed.docId) {
      showAppNotice(
        'Could not find the source document.',
        'Source not found'
      );
      return;
    }

    if (
      closeOutliner &&
      typeof closeOutlinerModal === 'function'
    ) {
      closeOutlinerModal();
    }

    await openDocument(
      parsed.docId
    );

    if (typeof setSourcesMode === 'function') {
      setSourcesMode(true);
    }

    const doc =
      await NaviStorage.getDocument(
        parsed.docId
      );

    if (!doc) {
      return;
    }

    const source =
      getCurrentSourceList(doc)
        .find(item => {
          return getSourceEntityId(
            parsed.docId,
            item.id
          ) === entityId;
        });

    if (
      source &&
      typeof openSourceModal === 'function'
    ) {
      openSourceModal(source);
    }

    return;
  }
  
  if (entityType === 'tag') {
  if (
    closeOutliner &&
    typeof closeOutlinerModal === 'function'
  ) {
    closeOutlinerModal();
  }

  showAppNotice(
    `Tag "${entityId}" is an implicit relationship. Tag filtering can be added in a later UI pass.`,
    'Tag relationship'
  );

  return;
}

  showAppNotice(
    'This relationship target cannot be opened directly yet.',
    'Link not available'
  );
}

function wireRelationshipEntityLinks(
  container,
  options = {}
) {
  if (!container) {
    return;
  }

  container
    .querySelectorAll(
      '[data-relationship-entity-type][data-relationship-entity-id]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        async event => {
          event.stopPropagation();

          const entityType =
            event.currentTarget.dataset.relationshipEntityType;

          const entityId =
            event.currentTarget.dataset.relationshipEntityId;

          await openRelationshipEntity(
            entityType,
            entityId,
            options
          );
        }
      );
    });
}

async function getEntityName(type, id) {
  const entity =
    await resolveEntity(type, id);

  if (!entity) {
    return 'Missing Item';
  }

  if (type === 'source' && entity.parentDocumentTitle) {
    return `${entity.title || 'Untitled Source'} · ${entity.parentDocumentTitle}`;
  }

  return (
    entity.title ||
    entity.name ||
    'Untitled'
  );
}

async function getRelationshipTargetOptions(type = 'document') {
  if (type === 'document') {
    const docs =
      documentsCache.length
        ? documentsCache
        : await NaviStorage.getAllDocuments();

    return docs
      .filter(doc => doc.id !== currentDocumentId)
      .sort((a, b) => {
        return String(a.title || '').localeCompare(String(b.title || ''));
      })
      .map(doc => ({
        id: doc.id,
        label: `${getDocumentTypeIcon(doc)} ${doc.title || 'Untitled Document'}`,
        desc: getReadableDocType(doc)
      }));
  }

  if (type === 'collection') {
    const collections =
      await getCollections();

    return collections
      .slice()
      .sort((a, b) => {
        return String(a.name || '').localeCompare(String(b.name || ''));
      })
      .map(collection => ({
        id: collection.id,
        label: `🗂 ${collection.name || 'Untitled Collection'}`,
        desc: getCollectionDocCountLabel(collection)
      }));
  }

  if (type === 'folder') {
    const docs =
      documentsCache.length
        ? documentsCache
        : await NaviStorage.getAllDocuments();

    return getFolderNamesFromDocuments(docs)
      .map(folder => ({
        id: folder,
        label: `📁 ${folder}`,
        desc: 'Folder'
      }));
  }

  if (type === 'source') {
    const docs =
      documentsCache.length
        ? documentsCache
        : await NaviStorage.getAllDocuments();

    const options = [];

    docs.forEach(doc => {
      getCurrentSourceList(doc).forEach(source => {
        options.push({
          id: getSourceEntityId(doc.id, source.id),
          label: `🔬 ${source.title || 'Untitled Source'}`,
          desc: doc.title || 'Untitled Document'
        });
      });
    });

    return options.sort((a, b) => {
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
  }

  return [];
}

async function populateRelationshipTypeSelect(selectedType = '') {
  if (!els.relationshipTypeSelect) {
    return;
  }

  const types =
    await getRelationshipTypes();

  const selected =
    normalizeRelationshipTypeName(selectedType) ||
    els.relationshipTypeSelect.value ||
    'related';

  els.relationshipTypeSelect.innerHTML = '';

  types.forEach(type => {
    const option =
      document.createElement('option');

    option.value = type;
    option.textContent = type;

    els.relationshipTypeSelect.appendChild(option);
  });

  if (!types.includes(selected)) {
    const option =
      document.createElement('option');

    option.value = selected;
    option.textContent = selected;

    els.relationshipTypeSelect.appendChild(option);
  }

  els.relationshipTypeSelect.value =
    selected;
}

async function populateRelationshipTargetSelect() {
  if (
    !els.relationshipTargetTypeSelect ||
    !els.relationshipTargetSelect
  ) {
    return;
  }

  const type =
    els.relationshipTargetTypeSelect.value || 'document';

  const options =
    await getRelationshipTargetOptions(type);

  els.relationshipTargetSelect.innerHTML =
    '<option value="">Choose target...</option>';

  options.forEach(option => {
    const item =
      document.createElement('option');

    item.value =
      option.id;

    item.textContent =
      option.desc
        ? `${option.label} — ${option.desc}`
        : option.label;

    els.relationshipTargetSelect.appendChild(item);
  });

  if (!options.length) {
    const empty =
      document.createElement('option');

    empty.value = '';
    empty.textContent = 'No targets available';
    els.relationshipTargetSelect.appendChild(empty);
  }
}

async function renderRelationshipTypesModal() {
  if (!els.relationshipTypesList) {
    return;
  }

  const customTypes =
    await getCustomRelationshipTypes();

  const defaultHtml =
    DEFAULT_RELATIONSHIP_TYPES
      .map(type => {
        return `
          <div class="relationship-type-row default-type">
            <span>${escapeHtml(type)}</span>
            <span class="relationship-type-badge">Default</span>
          </div>
        `;
      })
      .join('');

  const customHtml =
    customTypes.length
      ? customTypes
          .map(type => {
            return `
              <div class="relationship-type-row">
                <span>${escapeHtml(type)}</span>

                <button
                  type="button"
                  class="relationship-type-delete-btn"
                  data-relationship-type="${escapeHtml(type)}"
                  title="Delete custom type"
                >
                  ×
                </button>
              </div>
            `;
          })
          .join('')
      : `
          <div class="empty-note relationship-type-empty">
            No custom types yet.
          </div>
        `;

  els.relationshipTypesList.innerHTML = `
    <div class="relationship-type-group">
      <div class="relationship-type-group-title">Default Types</div>
      ${defaultHtml}
    </div>

    <div class="relationship-type-group">
      <div class="relationship-type-group-title">Custom Types</div>
      ${customHtml}
    </div>
  `;

  els.relationshipTypesList
    .querySelectorAll('[data-relationship-type]')
    .forEach(button => {
      button.addEventListener('click', async event => {
        const type =
          event.currentTarget.dataset.relationshipType;

        if (!type) {
          return;
        }

        await deleteCustomRelationshipType(type);

        await renderRelationshipTypesModal();
        await populateRelationshipTypeSelect(
          els.relationshipTypeSelect?.value || 'related'
        );

        NaviEditor.setSaveStatus('Relationship type deleted');
      });
    });
}

async function openRelationshipTypesModal() {
  if (!els.relationshipTypesModal) {
    return;
  }

  if (els.relationshipTypeNameInput) {
    els.relationshipTypeNameInput.value = '';
  }

  await renderRelationshipTypesModal();

  els.relationshipTypesModal.classList.remove('hidden');

  setTimeout(() => {
    els.relationshipTypeNameInput?.focus();
  }, 0);
}

function closeRelationshipTypesModal() {
  if (els.relationshipTypesModal) {
    els.relationshipTypesModal.classList.add('hidden');
  }
}

async function submitRelationshipTypeAdd() {
  const value =
    els.relationshipTypeNameInput?.value || '';

  const createdType =
    await addCustomRelationshipType(value);

  if (!createdType) {
    return;
  }

  if (els.relationshipTypeNameInput) {
    els.relationshipTypeNameInput.value = '';
  }

  await renderRelationshipTypesModal();
  await populateRelationshipTypeSelect(createdType);

  NaviEditor.setSaveStatus('Relationship type added');
}

async function openRelationshipModal() {
  if (!currentDocumentId) {
    showAppNotice(
      'Open a document first.',
      'No document selected'
    );
    return;
  }

  if (!els.relationshipModal) {
    return;
  }

  if (els.relationshipTargetTypeSelect) {
    els.relationshipTargetTypeSelect.value = 'document';
  }

  await populateRelationshipTypeSelect('related');

  if (els.relationshipStrengthSelect) {
    els.relationshipStrengthSelect.value = '3';
  }

  if (els.relationshipNoteInput) {
    els.relationshipNoteInput.value = '';
  }

  await populateRelationshipTargetSelect();

  els.relationshipModal.classList.remove('hidden');

  setTimeout(() => {
    els.relationshipTargetSelect?.focus();
  }, 0);
}

function closeRelationshipModal() {
  if (els.relationshipModal) {
    els.relationshipModal.classList.add('hidden');
  }
}

async function submitRelationshipModal() {
  if (!currentDocumentId) {
    return;
  }

  const targetType =
    els.relationshipTargetTypeSelect?.value || 'document';

  const targetId =
    els.relationshipTargetSelect?.value || '';

  const relationType =
    els.relationshipTypeSelect?.value || 'related';

  const strength =
    Number(els.relationshipStrengthSelect?.value || 1) || 1;

  const note =
    els.relationshipNoteInput?.value.trim() || '';

  if (!targetId) {
    showAppNotice(
      'Choose something to link to.',
      'No target selected'
    );
    return;
  }

  await createRelationship({
    sourceEntityType: 'document',
    sourceEntityId: currentDocumentId,

    targetEntityType: targetType,
    targetEntityId: targetId,

    relationType,
    note,
    strength
  });

  relationshipsCache =
    await getRelationships();

  closeRelationshipModal();

  await renderRelationshipPanel(currentDocumentId);

  NaviEditor.setSaveStatus('Relationship created');
}

function getSourceEntityId(docId, sourceId) {
  return `${docId}::${sourceId}`;
}

async function
getBacklinksForEntity(
  entityType,
  entityId
) {
  const relationships =
    await getRelationships();

  return relationships.filter(
    r =>
      r.targetEntityType === entityType &&
      r.targetEntityId === entityId
  );
}

async function getRelationships() {
  const saved =
    await NaviStorage.getSetting(
      RELATIONSHIPS_KEY,
      []
    );

  return Array.isArray(saved)
    ? saved.map(r => ({
        strength: 1,
        note: '',
        ...r
      }))
    : [];
}

function normalizeRelationshipTypeName(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48);
}

async function getCustomRelationshipTypes() {
  const saved =
    await NaviStorage.getSetting(
      RELATIONSHIP_TYPES_KEY,
      []
    );

  if (!Array.isArray(saved)) {
    return [];
  }

  return saved
    .map(normalizeRelationshipTypeName)
    .filter(Boolean);
}

async function saveCustomRelationshipTypes(types = []) {
  const cleanTypes =
    Array.from(
      new Set(
        types
          .map(normalizeRelationshipTypeName)
          .filter(Boolean)
      )
    )
      .filter(type => {
        return !DEFAULT_RELATIONSHIP_TYPES.includes(type);
      })
      .sort((a, b) => {
        return a.localeCompare(b);
      });

  await NaviStorage.saveSetting(
    RELATIONSHIP_TYPES_KEY,
    cleanTypes
  );

  return cleanTypes;
}

async function getRelationshipTypes() {
  const customTypes =
    await getCustomRelationshipTypes();

  return Array.from(
    new Set([
      ...DEFAULT_RELATIONSHIP_TYPES,
      ...customTypes
    ])
  );
}

async function addCustomRelationshipType(name) {
  const cleanName =
    normalizeRelationshipTypeName(name);

  if (!cleanName) {
    showAppNotice(
      'Enter a relationship type name.',
      'Missing relationship type'
    );
    return null;
  }

  const currentTypes =
    await getCustomRelationshipTypes();

  const allTypes =
    await getRelationshipTypes();

  if (allTypes.includes(cleanName)) {
    showAppNotice(
      `"${cleanName}" already exists.`,
      'Duplicate relationship type'
    );
    return cleanName;
  }

  currentTypes.push(cleanName);

  await saveCustomRelationshipTypes(currentTypes);

  return cleanName;
}

async function deleteCustomRelationshipType(name) {
  const cleanName =
    normalizeRelationshipTypeName(name);

  if (!cleanName) {
    return;
  }

  if (DEFAULT_RELATIONSHIP_TYPES.includes(cleanName)) {
    showAppNotice(
      'Default relationship types cannot be deleted.',
      'Protected type'
    );
    return;
  }

  const currentTypes =
    await getCustomRelationshipTypes();

  const nextTypes =
    currentTypes.filter(type => {
      return type !== cleanName;
    });

  await saveCustomRelationshipTypes(nextTypes);
}

async function saveRelationships(
  relationships
) {
  await NaviStorage.saveSetting(
    RELATIONSHIPS_KEY,
    Array.isArray(relationships)
      ? relationships
      : []
  );
}

async function createRelationship(
  relationship
) {
  const relationships =
    await getRelationships();

  const newRelationship = {
    id: crypto.randomUUID(),

    sourceEntityType: 'document',
    sourceEntityId: '',

    targetEntityType: 'document',
    targetEntityId: '',

    relationType: 'related',

    note: '',

    // FUTURE GRAPH SUPPORT
    strength: 1,

    createdAt: Date.now(),
    updatedAt: Date.now(),

    ...relationship
  };

  relationships.push(
    newRelationship
  );

  await saveRelationships(
    relationships
  );

  relationshipsCache =
    relationships;

  return newRelationship;
}

async function updateRelationship(
  id,
  updates
) {
  const relationships =
    await getRelationships();

  const index =
    relationships.findIndex(
      r => r.id === id
    );

  if (index < 0) {
    return null;
  }

  relationships[index] = {
    ...relationships[index],
    ...updates,
    updatedAt: Date.now()
  };

  await saveRelationships(
    relationships
  );

  relationshipsCache =
    relationships;

  return relationships[index];
}

async function deleteRelationship(
  id
) {
  const relationships =
    await getRelationships();

  const filtered =
    relationships.filter(
      r => r.id !== id
    );

  await saveRelationships(
    filtered
  );

  relationshipsCache = filtered;
}

async function
getRelationshipsForEntity(
  entityType,
  entityId
) {
  const relationships =
    await getRelationships();

  return relationships.filter(
    r =>
      r.sourceEntityType === entityType &&
      r.sourceEntityId === entityId
  );
}

function makeEntityRef(
  type,
  id
) {
  return {
    entityType: String(type),
    entityId: String(id)
  };
}

function isResearchDocument(doc) {
  return doc?.docType === 'research';
}

function openChoiceModal({
  title = 'Choose Option',
  subtitle = 'Select an option.',
  options = []
} = {}) {
  if (
    !els.choiceModal ||
    !els.choiceModalGrid
  ) {
    return Promise.resolve(null);
  }

  if (els.choiceModalTitle) {
    els.choiceModalTitle.textContent = title;
  }

  if (els.choiceModalSubtitle) {
    els.choiceModalSubtitle.textContent = subtitle;
  }

  els.choiceModalGrid.innerHTML = '';

  if (!options.length) {
    els.choiceModalGrid.innerHTML =
      '<div class="empty-note">No options available.</div>';
  }

  options.forEach(option => {
    const card = document.createElement('button');

    card.type = 'button';
    card.className = 'choice-card';
    card.dataset.choiceValue = option.value;

    const iconHtml = option.color
      ? `<span class="choice-card-color-swatch" style="background:${option.color}"></span>`
      : `<span class="choice-card-icon">${option.icon || '•'}</span>`;

    card.innerHTML = `
      ${iconHtml}
      <span class="choice-card-title">${escapeHtml(option.title || option.value)}</span>
      <span class="choice-card-desc">${escapeHtml(option.desc || '')}</span>
    `;

    card.onclick = () => {
      resolveChoiceModal(option.value);
    };

    els.choiceModalGrid.appendChild(card);
  });

  els.choiceModal.classList.remove('hidden');

  return new Promise(resolve => {
    pendingChoiceResolve = resolve;
  });
}

function resolveChoiceModal(value = null) {
  if (els.choiceModal) {
    els.choiceModal.classList.add('hidden');
  }

  const resolver = pendingChoiceResolve;

  pendingChoiceResolve = null;

  if (resolver) {
    resolver(value);
  }
}

function getSplitCandidateDocuments() {
  return documentsCache
    .slice()
    .sort((a, b) => {
      const titleA = String(a.title || '').toLowerCase();
      const titleB = String(b.title || '').toLowerCase();

      return titleA.localeCompare(titleB);
    });
}

function getSplitDocOptionLabel(doc) {
  const icon =
    typeof getDocumentTypeIcon === 'function'
      ? getDocumentTypeIcon(doc)
      : '📄';

  const type =
    typeof getReadableDocType === 'function'
      ? getReadableDocType(doc)
      : doc.docType || 'Doc';

  return `${icon} ${doc.title || 'Untitled Document'} — ${type}`;
}

async function populateSplitDocSelect() {
  if (!els.splitDocSelect) return;

  const previousValue =
    splitPaneDocId || els.splitDocSelect.value || '';

  const docs =
    getSplitCandidateDocuments();

  els.splitDocSelect.innerHTML =
    '<option value="">Choose document...</option>';

  docs.forEach(doc => {
    const option =
      document.createElement('option');

    option.value = doc.id;
    option.textContent = getSplitDocOptionLabel(doc);

    els.splitDocSelect.appendChild(option);
  });

  const hasPrevious =
    docs.some(doc => doc.id === previousValue);

  if (hasPrevious) {
    els.splitDocSelect.value = previousValue;
  }
}

function getFallbackSplitDocumentId() {
  const docs =
    getSplitCandidateDocuments();

  const firstOther =
    docs.find(doc => doc.id !== currentDocumentId);

  return firstOther?.id || docs[0]?.id || '';
}

async function renderSplitPaneDocument() {
  if (!els.splitDocContent || !els.splitDocMeta) {
    return;
  }

  clearTimeout(splitPaneAutosaveTimer);

  if (!splitPaneDocId) {
    els.splitDocContent.innerHTML = `
      <div class="empty-note">
        Select a document to preview it here.
      </div>
    `;

    els.splitDocMeta.textContent =
      'Choose a document to view beside your current draft.';

    updateSplitPaneEditButtons();
    return;
  }

  const doc =
    await NaviStorage.getDocument(splitPaneDocId);

  if (!doc) {
    els.splitDocContent.innerHTML = `
      <div class="empty-note">
        Split document not found.
      </div>
    `;

    els.splitDocMeta.textContent =
      'Document could not be loaded.';

    updateSplitPaneEditButtons();
    return;
  }

  const words =
    Number(doc.wordCount || 0);

  const type =
    typeof getReadableDocType === 'function'
      ? getReadableDocType(doc)
      : doc.docType || 'Doc';

  const status =
    typeof renderStatusChip === 'function'
      ? renderStatusChip(
          typeof getDocStatusForDisplay === 'function'
            ? getDocStatusForDisplay(doc)
            : doc.status || ''
        )
      : '';

  els.splitDocMeta.innerHTML = `
    <span>${escapeHtml(type)}</span>
    <span>•</span>
    <span>${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}</span>
    ${
      doc.folder
        ? `<span>•</span><span>📁 ${escapeHtml(doc.folder)}</span>`
        : ''
    }
    ${
      status
        ? `<span class="split-meta-status">${status}</span>`
        : ''
    }
    ${
      splitPaneEditable
        ? `<span class="split-meta-editing">Editing split document</span>`
        : ''
    }
  `;

  if (splitPaneEditable) {
    els.splitDocContent.innerHTML = `
      <article class="split-doc-preview split-doc-editable">
        <input
          class="split-doc-title-input"
          data-split-title-input
          value="${escapeHtml(doc.title || 'Untitled Document')}"
          aria-label="Split document title"
        />

        <div
          class="split-doc-body split-doc-edit-body"
          data-split-edit-body
          contenteditable="true"
          spellcheck="true"
        >
          ${getExportSafeDocumentContent(doc)}
        </div>
      </article>
    `;

    const {
      titleInput,
      body
    } =
      getSplitPaneEditorElements();

    if (titleInput) {
      titleInput.addEventListener(
        'input',
        scheduleSplitPaneAutosave
      );
    }

    if (body) {
      body.addEventListener(
        'input',
        scheduleSplitPaneAutosave
      );

      body.addEventListener('paste', event => {
        event.preventDefault();

        const text =
          event.clipboardData?.getData('text/plain') || '';

        document.execCommand(
          'insertText',
          false,
          text
        );
      });
    }

    return;
  }

  els.splitDocContent.innerHTML = `
    <article class="split-doc-preview">
      <h2>${escapeHtml(doc.title || 'Untitled Document')}</h2>

      <div class="split-doc-body">
        ${getExportSafeDocumentContent(doc)}
      </div>
    </article>
  `;

  /*
    Keep preview read-only even if imported HTML contains editable pieces.
  */
  els.splitDocContent
    .querySelectorAll('[contenteditable]')
    .forEach(node => {
      node.setAttribute(
        'contenteditable',
        'false'
      );
    });

  updateSplitPaneEditButtons();
}

function scheduleSplitPaneAutosave() {
  clearTimeout(splitPaneAutosaveTimer);

  splitPaneAutosaveTimer =
    setTimeout(() => {
      saveSplitPaneDocument();
    }, SPLIT_PANE_AUTOSAVE_DELAY);

  if (els.saveSplitPaneBtn) {
    els.saveSplitPaneBtn.textContent =
      'Saving...';
  }
}

async function saveSplitPaneDocument() {
  if (!splitPaneEditable || !splitPaneDocId) {
    return;
  }

  const {
    titleInput,
    body
  } =
    getSplitPaneEditorElements();

  if (!body) {
    return;
  }

  const doc =
    await NaviStorage.getDocument(splitPaneDocId);

  if (!doc) {
    return;
  }

  const nextTitle =
    titleInput?.value.trim() ||
    doc.title ||
    'Untitled Document';

  const nextContent =
    body.innerHTML && body.innerHTML.trim()
      ? body.innerHTML
      : '<p></p>';

  const plainText =
    getSplitPanePlainTextFromHtml(
      nextContent
    );

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      title:
        nextTitle,
      content:
        nextContent,
      plainText,
      wordCount:
        NaviEditor.countWords(plainText),
      charCount:
        plainText.length,
      updatedAt:
        Date.now()
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  renderDocumentList(documentsCache);

  if (els.splitDocSelect) {
    await populateSplitDocSelect();
    els.splitDocSelect.value =
      saved.id;
  }

  if (els.saveSplitPaneBtn) {
    els.saveSplitPaneBtn.textContent =
      'Saved';
  }

  els.splitDocMeta.innerHTML = `
    <span>${escapeHtml(
      typeof getReadableDocType === 'function'
        ? getReadableDocType(saved)
        : saved.docType || 'Doc'
    )}</span>
    <span>•</span>
    <span>${Number(saved.wordCount || 0).toLocaleString()} ${
      Number(saved.wordCount || 0) === 1 ? 'word' : 'words'
    }</span>
    ${
      saved.folder
        ? `<span>•</span><span>📁 ${escapeHtml(saved.folder)}</span>`
        : ''
    }
    <span class="split-meta-editing">Editing split document</span>
  `;

  setTimeout(() => {
    if (els.saveSplitPaneBtn && splitPaneEditable) {
      els.saveSplitPaneBtn.textContent =
        'Save Split';
    }
  }, 900);

  NaviEditor.setSaveStatus(
    'Split document saved'
  );
}

async function openSplitEditor(docId = null) {
  if (!els.splitPane || !els.workspace || !currentDocumentId) return;

  await populateSplitDocSelect();

  const current =
    await NaviStorage.getDocument(currentDocumentId);

  splitOwnerDocumentId =
    currentDocumentId;

  splitPaneDocId =
    docId ||
    current?.splitPaneDocId ||
    splitPaneDocId ||
    getFallbackSplitDocumentId();

  if (splitPaneDocId === currentDocumentId) {
    splitPaneDocId = getFallbackSplitDocumentId();
  }

  if (els.splitDocSelect) {
    els.splitDocSelect.value = splitPaneDocId || '';
  }

  showSplitShell();
  
  splitPaneEditable = false;
updateSplitPaneEditButtons();

  await renderSplitPaneDocument();

  await saveSplitStateForDocument(
    splitOwnerDocumentId,
    splitPaneDocId || ''
  );
}

async function closeSplitEditor({
  clearSaved = true
} = {}) {
  const ownerId =
    splitOwnerDocumentId || currentDocumentId;
  
  if (splitPaneEditable) {
  await saveSplitPaneDocument();
}

splitPaneEditable = false;
clearTimeout(splitPaneAutosaveTimer);

  hideSplitShell();

  if (clearSaved && ownerId) {
    await saveSplitStateForDocument(ownerId, '');
  }

  splitPaneDocId = null;
  splitOwnerDocumentId = null;
}

async function handleSplitDocSelectChange() {
  
  if (splitPaneEditable) {
  await saveSplitPaneDocument();
}
  
  splitPaneDocId =
    els.splitDocSelect?.value || null;
  
  splitPaneEditable = false;
updateSplitPaneEditButtons();

  if (
    splitOwnerDocumentId &&
    splitPaneDocId
  ) {
    await saveSplitStateForDocument(
      splitOwnerDocumentId,
      splitPaneDocId
    );
  }

  await renderSplitPaneDocument();
}

async function restoreSplitForDocument(doc) {
  if (!doc || !doc.id) {
    await closeSplitEditor({
      clearSaved: false
    });
    return;
  }

  if (!doc.splitPaneDocId) {
    await closeSplitEditor({
      clearSaved: false
    });
    return;
  }

  if (doc.splitPaneDocId === doc.id) {
    await closeSplitEditor({
      clearSaved: false
    });
    return;
  }

  splitOwnerDocumentId =
    doc.id;

  splitPaneDocId =
    doc.splitPaneDocId;

  await populateSplitDocSelect();

  if (els.splitDocSelect) {
    els.splitDocSelect.value =
      splitPaneDocId || '';
  }

  showSplitShell();

  await renderSplitPaneDocument();
}

async function openSplitDocAsMain() {
  if (!splitPaneDocId) {
    showAppNotice(
      'Choose a split document first.',
      'No split document selected'
    );
    return;
  }

  const targetId =
    splitPaneDocId;

  /*
    Opening the reference as main should close the split UI,
    but should NOT erase the split saved on the original document.
  */
  
  if (splitPaneEditable) {
  await saveSplitPaneDocument();
}
  
  await closeSplitEditor({
    clearSaved: false
  });

  await openDocument(targetId);
}

function openBoardLinkModal(existingItem = null) {
  if (!els.boardLinkModal) {
    return Promise.resolve(null);
  }

  editingBoardLinkId = existingItem?.id || null;

  if (els.boardLinkTitleInput) {
    els.boardLinkTitleInput.value = existingItem?.title || '';
    els.boardLinkTitleInput.placeholder = 'New Link';
  }

  if (els.boardLinkUrlInput) {
    els.boardLinkUrlInput.value = existingItem?.url || '';
    els.boardLinkUrlInput.placeholder = 'https://';
  }

  if (els.submitBoardLinkModalBtn) {
    els.submitBoardLinkModalBtn.textContent =
      editingBoardLinkId ? 'Save Link' : 'Add Link';
  }

  els.boardLinkModal.classList.remove('hidden');

  setTimeout(() => {
    els.boardLinkTitleInput?.focus();
  }, 0);

  return new Promise(resolve => {
    pendingBoardLinkResolve = resolve;
  });
}

function resolveBoardLinkModal(value = null) {
  if (els.boardLinkModal) {
    els.boardLinkModal.classList.add('hidden');
  }

  const resolver = pendingBoardLinkResolve;

  pendingBoardLinkResolve = null;

  if (resolver) {
    resolver(value);
  }
}

function submitBoardLinkModal() {
  const title =
    els.boardLinkTitleInput?.value.trim() || 'New Link';

  const url =
    els.boardLinkUrlInput?.value.trim() || '';

  if (!url) {
    showAppNotice(
      'Add a URL before creating the link.',
      'Missing URL'
    );
    return;
  }

  if (editingBoardLinkId) {
    const existing =
      currentBoardData.items.find(item => {
        return item.id === editingBoardLinkId;
      });

    if (existing) {
      pushBoardUndoState();
      existing.title = title;
      existing.url = url;
      existing.docId = '';
      renderBoard();
      scheduleAutosave();
    }

    editingBoardLinkId = null;
    resolveBoardLinkModal(null);
    return;
  }

  resolveBoardLinkModal({
    title,
    url
  });
}

function openBoardConnectionModal() {
  if (!els.boardConnectionModal) {
    return Promise.resolve({
      label: 'related',
      type: 'straight'
    });
  }

  if (els.boardConnectionLabelInput) {
    els.boardConnectionLabelInput.value = 'related';
  }

  if (els.boardConnectionTypeSelect) {
    els.boardConnectionTypeSelect.value = 'straight';
  }

  els.boardConnectionModal.classList.remove('hidden');

  setTimeout(() => {
    els.boardConnectionLabelInput?.focus();
    els.boardConnectionLabelInput?.select();
  }, 0);

  return new Promise(resolve => {
    pendingBoardConnectionResolve = resolve;
  });
}

function resolveBoardConnectionModal(value = null) {
  if (els.boardConnectionModal) {
    els.boardConnectionModal.classList.add('hidden');
  }

  const resolver = pendingBoardConnectionResolve;

  pendingBoardConnectionResolve = null;

  if (resolver) {
    resolver(value);
  }
}

function submitBoardConnectionModal() {
  const label =
    els.boardConnectionLabelInput?.value.trim() || '';

  const type =
    els.boardConnectionTypeSelect?.value || 'straight';

  resolveBoardConnectionModal({
    label,
    type
  });
}

function closeBoardConnectionModal() {
  resolveBoardConnectionModal(null);
}

function closeBoardLinkModal() {
  editingBoardLinkId = null;
  resolveBoardLinkModal(null);
}

function closeChoiceModal() {
  resolveChoiceModal(null);
}

function showMessageModal({
  title = 'Message',
  message = '',
  kind = 'info'
} = {}) {
  if (!els.messageModal) {
    alert(message || title);
    return Promise.resolve();
  }

  els.messageModal.classList.remove(
    'error-message',
    'warning-message'
  );

  if (kind === 'error') {
    els.messageModal
      .querySelector('.subdoc-modal')
      ?.classList.add('error-message');
  }

  if (kind === 'warning') {
    els.messageModal
      .querySelector('.subdoc-modal')
      ?.classList.add('warning-message');
  }

  if (els.messageModalTitle) {
    els.messageModalTitle.textContent = title;
  }

  if (els.messageModalText) {
    els.messageModalText.textContent = message;
  }

  els.messageModal.classList.remove('hidden');

  return new Promise(resolve => {
    pendingMessageResolve = resolve;
  });
}

function closeMessageModal() {
  if (els.messageModal) {
    els.messageModal.classList.add('hidden');
  }

  const resolver = pendingMessageResolve;

  pendingMessageResolve = null;

  if (resolver) {
    resolver();
  }
}

function showAppError(message, title = 'Something went wrong') {
  return showMessageModal({
    title,
    message,
    kind: 'error'
  });
}

function showAppNotice(message, title = 'NaviWriter') {
  return showMessageModal({
    title,
    message,
    kind: 'info'
  });
}



function loadCollapsedDocIds() {
  try {
    const raw = localStorage.getItem('naviwriter-collapsed-docs');
    const parsed = raw ? JSON.parse(raw) : [];

    collapsedDocIds = new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    collapsedDocIds = new Set();
  }
}

function saveCollapsedDocIds() {
  try {
    localStorage.setItem(
      'naviwriter-collapsed-docs',
      JSON.stringify(Array.from(collapsedDocIds))
    );
  } catch {}
}

function toggleDocCollapsed(id) {
  if (!id) return;

  if (collapsedDocIds.has(id)) {
    collapsedDocIds.delete(id);
  } else {
    collapsedDocIds.add(id);
  }

  saveCollapsedDocIds();
  renderDocumentList(documentsCache);
}

async function importDocxFile(file) {



  if (!window.mammoth) {
    throw new Error('DOCX tools are not loaded.');
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    {
      arrayBuffer
    },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='heading 1'] => h1:fresh",
        "p[style-name='heading 2'] => h2:fresh",
        "p[style-name='heading 3'] => h3:fresh"
      ],

      includeDefaultStyleMap: true,

      convertImage: mammoth.images.imgElement(async image => {
        let base64 = '';

        if (typeof image.readAsBase64String === 'function') {
          base64 = await image.readAsBase64String();
        } else if (typeof image.read === 'function') {
          base64 = await image.read('base64');
        }

        return {
          src: `data:${image.contentType};base64,${base64}`,
          alt: image.altText || ''
        };
      })
    }
  );

  const title =
    file.name.replace(/\.docx$/i, '') ||
    'Imported DOCX';

  const content =
    result.value && result.value.trim()
      ? result.value
      : '<p></p>';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = content;

  const plainText =
    wrapper.innerText || '';

  const doc =
    NaviStorage.createBlankDocument(title);

  doc.docType = 'general';
  doc.content = content;
  doc.plainText = plainText;
  doc.wordCount = NaviEditor.countWords(plainText);
  doc.charCount = plainText.length;
  doc.importedFrom = file.name;
  doc.importDate = Date.now();

  const saved =
    await NaviStorage.saveDocument(doc);

  await loadDocuments();
  await openDocument(saved.id);

  if (result.messages && result.messages.length) {
    console.warn('DOCX import messages:', result.messages);
  }

console.log('DOCX HTML:', result.value);

}

function getBoardMinimapParentRect() {
  const parent =
    els.boardMinimap?.offsetParent ||
    document.body;

  return parent.getBoundingClientRect();
}

function clampBoardMinimapPosition(x, y) {
  if (!els.boardMinimap) {
    return {
      x,
      y
    };
  }

  const parentRect =
    getBoardMinimapParentRect();

  const width =
    els.boardMinimap.offsetWidth || 230;

  const height =
    els.boardMinimap.offsetHeight || 170;

  return {
    x:
      Math.max(
        8,
        Math.min(
          x,
          parentRect.width - width - 8
        )
      ),

    y:
      Math.max(
        8,
        Math.min(
          y,
          parentRect.height - height - 8
        )
      )
  };
}

function applyBoardMinimapPosition(position) {
  if (!els.boardMinimap || !position) {
    return;
  }

  const clamped =
    clampBoardMinimapPosition(
      Number(position.x || 0),
      Number(position.y || 0)
    );

  els.boardMinimap.style.left =
    `${clamped.x}px`;

  els.boardMinimap.style.top =
    `${clamped.y}px`;

  els.boardMinimap.style.right =
    'auto';

  els.boardMinimap.style.bottom =
    'auto';
}

function saveBoardMinimapPosition() {
  if (!els.boardMinimap) {
    return;
  }

  try {
    localStorage.setItem(
      BOARD_MINIMAP_POSITION_KEY,
      JSON.stringify({
        x: Number.parseFloat(
          els.boardMinimap.style.left || '18'
        ),
        y: Number.parseFloat(
          els.boardMinimap.style.top || '18'
        )
      })
    );
  } catch {}
}

function loadBoardMinimapPosition() {
  try {
    const raw =
      localStorage.getItem(
        BOARD_MINIMAP_POSITION_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function placeBoardMinimapDefaultIfNeeded() {
  if (!els.boardMinimap) {
    return;
  }

  const saved =
    loadBoardMinimapPosition();

  if (saved) {
    applyBoardMinimapPosition(saved);
    return;
  }

  /*
    Default position: bottom-left-ish.
    We convert it to explicit left/top so dragging has a stable base.
  */
  const parentRect =
    getBoardMinimapParentRect();

  const width =
    els.boardMinimap.offsetWidth || 230;

  const height =
    els.boardMinimap.offsetHeight || 170;

  applyBoardMinimapPosition({
    x: 18,
    y: parentRect.height - height - 18
  });
}

function showBoardMinimap() {
  if (!els.boardMinimap) {
    return;
  }

  els.boardMinimap.classList.remove('hidden');

  requestAnimationFrame(() => {
    placeBoardMinimapDefaultIfNeeded();
    renderBoardMinimap();
  });
}

function hideBoardMinimap() {
  if (!els.boardMinimap) {
    return;
  }

  els.boardMinimap.classList.add('hidden');
}

function toggleBoardMinimap() {
  if (!els.boardMinimap) {
    return;
  }

  if (els.boardMinimap.classList.contains('hidden')) {
    showBoardMinimap();
  } else {
    hideBoardMinimap();
  }
}

async function colorSelectedBoardItem() {
  if (!activeBoardItemId) {
    showAppNotice(
      'Select a board item first.',
      'No board item selected'
    );
    return;
  }

  const item =
    currentBoardData.items.find(existing => {
      return existing.id === activeBoardItemId;
    });

  if (!item) return;

  const colorChoice =
    await openChoiceModal({
      title: 'Choose Board Item Color',
      subtitle: 'Pick a color for the selected board item.',
      options: [
        {
          value: '#fff8b5',
          color: '#fff8b5',
          title: 'Yellow',
          desc: 'Classic sticky note.'
        },
        {
          value: '#dbeafe',
          color: '#dbeafe',
          title: 'Blue',
          desc: 'Cool reference card.'
        },
        {
          value: '#dcfce7',
          color: '#dcfce7',
          title: 'Green',
          desc: 'Linked or resolved idea.'
        },
        {
          value: '#fce7f3',
          color: '#fce7f3',
          title: 'Pink',
          desc: 'Character or emotional beat.'
        },
        {
          value: '#ede9fe',
          color: '#ede9fe',
          title: 'Purple',
          desc: 'Lore, magic, or special note.'
        },
        {
          value: '#fee2e2',
          color: '#fee2e2',
          title: 'Red',
          desc: 'Conflict, warning, or danger.'
        },
        {
          value: '#ffffff',
          color: '#ffffff',
          title: 'White',
          desc: 'Neutral/default card.'
        }
      ]
    });

  if (!colorChoice) return;

  pushBoardUndoState();

  item.color = colorChoice;

  renderBoard();
  scheduleAutosave();
}

function cloneBoardData(board) {
  return JSON.parse(
    JSON.stringify(
      normalizeBoardData(board)
    )
  );
}



function pushBoardUndoState() {
  boardUndoStack.push(
    cloneBoardData(currentBoardData)
  );

  if (boardUndoStack.length > BOARD_UNDO_LIMIT) {
    boardUndoStack.shift();
  }

  // Once the user makes a new change, redo history should reset.
  boardRedoStack = [];
}

function restoreBoardState(board) {
  currentBoardData = normalizeBoardData(board);

  activeBoardItemId = null;
selectedBoardItemIds.clear();
  boardConnectMode = false;
  boardConnectStartId = null;

  document.body.classList.remove('board-connect-mode');

  renderBoard();
  scheduleAutosave();
}

function undoBoardChange() {
  if (!boardUndoStack.length) {
    return;
  }

  boardRedoStack.push(
    cloneBoardData(currentBoardData)
  );

  const previousState = boardUndoStack.pop();

  restoreBoardState(previousState);
}

function redoBoardChange() {
  if (!boardRedoStack.length) {
    return;
  }

  boardUndoStack.push(
    cloneBoardData(currentBoardData)
  );

  const nextState = boardRedoStack.pop();

  restoreBoardState(nextState);
}


function getChapterNumberFromTitle(title) {
  const match = String(title || '').match(/chapter\s+(\d+)/i);

  if (!match) return null;

  return Number(match[1]);
}

function sortDocumentsForDisplay(list = []) {
  return list.slice().sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrder))
      ? Number(a.sortOrder)
      : null;

    const orderB = Number.isFinite(Number(b.sortOrder))
      ? Number(b.sortOrder)
      : null;

    if (orderA !== null && orderB !== null) {
      return orderA - orderB;
    }

    const chapterA = getChapterNumberFromTitle(a.title);
    const chapterB = getChapterNumberFromTitle(b.title);

    if (chapterA !== null && chapterB !== null) {
      return chapterA - chapterB;
    }

    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function getDocumentTypeIcon(doc) {
  const type = doc?.docType || 'general';

  if (type === 'manuscript') return '📘';
  if (type === 'chapter') return '§';
  if (type === 'front-matter') return '📑';
  if (type === 'body-matter') return '📄';
  if (type === 'back-matter') return '📚';
  if (type === 'cover') return '🖼️';
  if (type === 'notes') return '📝';
  if (type === 'research') return '🔬';
  if (type === 'pdf') return '📎';
  if (type === 'compiled') return '📦';

  return '📋';
}

function getDocStatusForDisplay(doc) {
  if (
    doc?.status !== undefined &&
    doc?.status !== null
  ) {
    return doc.status;
  }

  if (typeof getDefaultStatusForDoc === 'function') {
    return getDefaultStatusForDoc(doc);
  }

  return '';
}

function buildOutlinerRows(documents = []) {
  const sortMode =
    els.outlinerSortSelect?.value || 'structure';

  /*
    Non-structure sorts intentionally flatten the outline.
    Otherwise "Words High-Low" would be trapped inside each parent,
    which feels fake. Structure mode preserves hierarchy.
  */
  if (sortMode !== 'structure') {
    return sortDocumentsForOutliner(documents).map(doc => {
      return {
        doc,
        depth: 0
      };
    });
  }

  const byParent = new Map();
  const visibleIds = new Set(documents.map(doc => doc.id));

  documents.forEach(doc => {
    const parentIsVisible =
      doc.parentId && visibleIds.has(doc.parentId);

    const key =
      parentIsVisible
        ? doc.parentId
        : 'root';

    if (!byParent.has(key)) {
      byParent.set(key, []);
    }

    byParent.get(key).push(doc);
  });

  const rows = [];

  function walk(parentId = 'root', depth = 0) {
    const group =
      sortDocumentsForDisplay(byParent.get(parentId) || []);

    group.forEach(doc => {
      rows.push({
        doc,
        depth
      });

      walk(doc.id, depth + 1);
    });
  }

  walk();

  return rows;
}

function outlinerMatchesSearch(doc, query) {
  const needle =
    String(query || '').trim().toLowerCase();

  if (!needle) return true;

  const haystack = [
    doc.title,
    doc.docType,
    doc.status,
    doc.pov,
    doc.location,
    doc.timeline,
    doc.characters,
    doc.tags?.join?.(', '),
    doc.folder,
    doc.summary
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

async function getOutlinerDocuments() {
  const baseDocs =
    await getOutlinerBaseDocuments();

  populateOutlinerFolderFilter(baseDocs);

  const query =
    els.outlinerSearchInput?.value || '';

  const statusFilter =
    els.outlinerStatusFilterSelect?.value || '';

  const typeFilter =
    els.outlinerTypeFilterSelect?.value || '';

  const folderFilter =
    els.outlinerFolderFilterSelect?.value || '';

  return baseDocs.filter(doc => {
    if (!outlinerMatchesSearch(doc, query)) {
      return false;
    }

    if (statusFilter) {
      const status =
        normalizeStatus(getDocStatusForDisplay(doc));

      if (statusFilter === '__none') {
        if (status) return false;
      } else if (status !== statusFilter) {
        return false;
      }
    }

    if (typeFilter) {
      if ((doc.docType || 'general') !== typeFilter) {
        return false;
      }
    }

    if (folderFilter) {
      if (getDocumentFolderName(doc) !== folderFilter) {
        return false;
      }
    }

    return true;
  });
}

function setOutlinerTableHeader(
  mode = 'table',
  customFields = []
) {
  if (!els.outlinerTableBody) {
    return;
  }

  const headerRow =
    els.outlinerTableBody
      .closest('table')
      ?.querySelector('thead tr');

  if (!headerRow) {
    return;
  }

  if (mode === 'relationships') {
    headerRow.innerHTML = `
      <th>Source</th>
      <th>Relationship</th>
      <th>Target</th>
      <th>Strength</th>
      <th>Note</th>
      <th>Actions</th>
    `;
    return;
  }

  const customHeaders =
    customFields
      .map(field => {
        return `
          <th
            class="outliner-custom-metadata-head"
            title="${escapeHtml(getCustomMetadataFieldTypeLabel(field.type))}"
          >
            ${escapeHtml(field.name)}
          </th>
        `;
      })
      .join('');

  headerRow.innerHTML = `
    <th>Title</th>
    <th>Type</th>
    <th>Status</th>
    <th>Words</th>
    <th>POV</th>
    <th>Location</th>
    <th>Folder</th>
    <th>Collections</th>
    ${customHeaders}
    <th>Updated</th>
  `;
}

function getRelationshipEntityIcon(type = '') {
  if (type === 'document') return '📄';
  if (type === 'collection') return '🗂';
  if (type === 'folder') return '📁';
  if (type === 'source') return '🔬';
  if (type === 'tag') return '#';
  if (type === 'customField') return '◆';
  if (type === 'boardItem') return '📌';
  if (type === 'relationshipType') return '↔';
  return '•';
}

function getRelationshipEntityLabel(type = '') {
  if (type === 'document') return 'Document';
  if (type === 'collection') return 'Collection';
  if (type === 'folder') return 'Folder';
  if (type === 'source') return 'Source';
  if (type === 'tag') return 'Tag';
  if (type === 'customField') return 'Custom Field';
  if (type === 'boardItem') return 'Board Item';
  if (type === 'relationshipType') return 'Relationship Type';

  return 'Entity';
}

async function renderOutlinerRelationships() {
  if (!els.outlinerTableBody) {
    return;
  }

  const docs =
    await getOutlinerDocuments();

  const visibleDocIds =
    new Set(
      docs.map(doc => doc.id)
    );

  const toggles =
    getOutlinerRelationshipToggleState();

  let visibleRelationships = [];

  if (toggles.explicit) {
    const explicitRelationships =
      await getRelationships();

    const matchingExplicitRelationships =
      explicitRelationships.filter(rel => {
        const sourceVisible =
          rel.sourceEntityType === 'document' &&
          visibleDocIds.has(rel.sourceEntityId);

        const targetVisible =
          rel.targetEntityType === 'document' &&
          visibleDocIds.has(rel.targetEntityId);

        return sourceVisible || targetVisible;
      });

    visibleRelationships.push(
      ...matchingExplicitRelationships
    );
  }

  if (toggles.collections) {
    const collectionRelationships =
      await buildImplicitCollectionRelationships(docs);

    visibleRelationships.push(
      ...collectionRelationships
    );
  }

  if (toggles.folders) {
    const folderRelationships =
      buildImplicitFolderRelationships(docs);

    visibleRelationships.push(
      ...folderRelationships
    );
  }
  
  if (toggles.sources) {
  const sourceRelationships =
    buildImplicitSourceRelationships(docs);

  visibleRelationships.push(
    ...sourceRelationships
  );
}

if (toggles.tags) {
  const tagRelationships =
    buildImplicitTagRelationships(docs);

  visibleRelationships.push(
    ...tagRelationships
  );
}

  if (!visibleRelationships.length) {
    els.outlinerTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="outliner-empty">
          No relationships found for this view.
        </td>
      </tr>
    `;

    return;
  }

  els.outlinerTableBody.innerHTML = '';

  for (const rel of visibleRelationships) {
    const sourceName =
      await getEntityName(
        rel.sourceEntityType,
        rel.sourceEntityId
      );

    const targetName =
      await getEntityName(
        rel.targetEntityType,
        rel.targetEntityId
      );

    const row =
      document.createElement('tr');

    row.className =
      'outliner-row relationship-outliner-row';

    row.innerHTML = `
      <td class="relationship-outliner-entity-cell">
        <button
          type="button"
          class="outliner-title-btn relationship-entity-link"
          data-relationship-entity-type="${escapeHtml(rel.sourceEntityType)}"
          data-relationship-entity-id="${escapeHtml(rel.sourceEntityId)}"
        >
          <span class="outliner-type-icon">
            ${escapeHtml(getRelationshipEntityIcon(rel.sourceEntityType))}
          </span>

          <span>
            ${escapeHtml(sourceName)}
          </span>
        </button>

        <div class="outliner-muted">
          ${escapeHtml(getRelationshipEntityLabel(rel.sourceEntityType))}
        </div>
      </td>

      <td>
        <span class="relationship-type-pill">
          ${escapeHtml(rel.relationType || 'related')}
        </span>
      </td>

      <td class="relationship-outliner-entity-cell">
        <button
          type="button"
          class="outliner-title-btn relationship-entity-link"
          data-relationship-entity-type="${escapeHtml(rel.targetEntityType)}"
          data-relationship-entity-id="${escapeHtml(rel.targetEntityId)}"
        >
          <span class="outliner-type-icon">
            ${escapeHtml(getRelationshipEntityIcon(rel.targetEntityType))}
          </span>

          <span>
            ${escapeHtml(targetName)}
          </span>
        </button>

        <div class="outliner-muted">
          ${escapeHtml(getRelationshipEntityLabel(rel.targetEntityType))}
        </div>
      </td>

      <td>
        <span
          class="relationship-strength"
          title="${escapeHtml(getRelationshipStrengthLabel(rel.strength))}"
        >
          ${escapeHtml(getRelationshipStrengthStars(rel.strength))}
        </span>
      </td>

      <td class="relationship-outliner-note">
        ${
          rel.note
            ? escapeHtml(rel.note)
            : '<span class="outliner-muted">—</span>'
        }
      </td>

      <td>
        ${
          rel.isImplicit
            ? `<span class="relationship-implicit-badge">Implicit</span>`
            : `
              <button
                type="button"
                class="relationship-delete-btn"
                data-relationship-id="${escapeHtml(rel.id)}"
                title="Delete relationship"
              >
                ×
              </button>
            `
        }
      </td>
    `;

    wireRelationshipEntityLinks(
      row,
      {
        closeOutliner: true
      }
    );

    row
      .querySelector('[data-relationship-id]')
      ?.addEventListener('click', async event => {
        event.stopPropagation();

        const relationshipId =
          event.currentTarget.dataset.relationshipId;

        if (!relationshipId) {
          return;
        }

        await deleteRelationship(relationshipId);

        relationshipsCache =
          await getRelationships();

        await renderOutlinerRelationships();

        if (currentDocumentId) {
          await renderRelationshipPanel(currentDocumentId);
        }

        NaviEditor.setSaveStatus('Relationship deleted');
      });

    els.outlinerTableBody.appendChild(row);
  }
}


async function renderOutliner() {
  syncOutlinerViewModeClass();
  if (!els.outlinerTableBody) {
    return;
  }

const viewMode =
  els.outlinerViewSelect?.value || 'table';

if (els.outlinerModal) {
  els.outlinerModal.classList.toggle(
    'relationship-view',
    viewMode === 'relationships'
  );
}

const customFields =
  viewMode === 'relationships'
    ? []
    : await getVisibleOutlinerCustomMetadataFields();

setOutlinerTableHeader(
  viewMode,
  customFields
);

  if (viewMode === 'relationships') {
    await renderOutlinerRelationships();
    return;
  }

  const docs =
    await getOutlinerDocuments();

  collectionsCache =
    await getCollections();

if (!docs.length) {
  els.outlinerTableBody.innerHTML = `
    <tr>
      <td colspan="${9 + customFields.length}" class="outliner-empty">
        No matching documents.
      </td>
    </tr>
  `;

  return;
}

  const rows =
    buildOutlinerRows(docs);

  els.outlinerTableBody.innerHTML = '';

  rows.forEach(({ doc, depth }) => {
    const row =
      document.createElement('tr');

    row.className =
      doc.id === currentDocumentId
        ? 'outliner-row active'
        : 'outliner-row';

    row.dataset.docId = doc.id;

    const words =
      Number(doc.wordCount || 0);

    const statusChip =
      renderStatusChip(
        getDocStatusForDisplay(doc)
      );

    const tagsText =
      Array.isArray(doc.tags) && doc.tags.length
        ? ` • ${doc.tags.join(', ')}`
        : '';
    
    const customMetadataCells =
  renderOutlinerCustomMetadataCells(
    doc,
    customFields
  );

    row.innerHTML = `
      <td class="outliner-title-cell">
        <button
          class="outliner-title-btn depth-${Math.min(depth, 5)}"
          data-open-doc-id="${escapeHtml(doc.id)}"
          type="button"
        >
          <span class="outliner-type-icon">
            ${escapeHtml(getDocumentTypeIcon(doc))}
          </span>

          <span>
            ${escapeHtml(doc.title || 'Untitled Document')}
          </span>
        </button>

        ${
          doc.summary
            ? `<div class="outliner-summary">${escapeHtml(doc.summary)}</div>`
            : ''
        }
      </td>

      <td>
        ${escapeHtml(getReadableDocType(doc))}
      </td>

      <td>
        ${
          statusChip
            ? statusChip
            : '<span class="outliner-muted">—</span>'
        }
      </td>

      <td>
        ${words.toLocaleString()}
      </td>

      <td>
        ${
          doc.pov
            ? escapeHtml(doc.pov)
            : '<span class="outliner-muted">—</span>'
        }
      </td>

      <td>
        ${
          doc.location
            ? escapeHtml(doc.location)
            : '<span class="outliner-muted">—</span>'
        }
      </td>

      <td>
        ${
          doc.folder
            ? `
              <button
                class="outliner-folder-link"
                data-outliner-folder="${escapeHtml(doc.folder)}"
                type="button"
              >
                ${escapeHtml(doc.folder)}
              </button>

              ${
                tagsText
                  ? `<span class="outliner-muted">${escapeHtml(tagsText)}</span>`
                  : ''
              }
            `
            : `
              <button
                class="outliner-folder-link muted"
                data-outliner-folder="Unfiled"
                type="button"
              >
                Unfiled
              </button>
            `
        }
      </td>

     <td class="outliner-collections-cell">
  ${renderOutlinerCollectionLinks(doc)}
</td>

${customMetadataCells}

<td>
  ${formatDate(doc.updatedAt)}
</td>
    `;

    row
      .querySelector('[data-open-doc-id]')
      ?.addEventListener('click', async event => {
        const docId =
          event.currentTarget.dataset.openDocId;

        if (!docId) {
          return;
        }

        closeOutlinerModal();
        await openDocument(docId);
      });

    row
      .querySelector('[data-outliner-folder]')
      ?.addEventListener('click', event => {
        event.stopPropagation();

        const folderName =
          event.currentTarget.dataset.outlinerFolder || '';

        activeFolderFilter =
          folderName === 'Unfiled'
            ? 'Unfiled'
            : folderName;

        closeOutlinerModal();
        renderDocumentList(documentsCache);
      });

    row
      .querySelectorAll('[data-outliner-collection]')
      .forEach(button => {
        button.addEventListener('click', async event => {
          event.stopPropagation();

          activeCollectionId =
            event.currentTarget.dataset.outlinerCollection || null;

          closeOutlinerModal();

          await openCollectionsModal();
        });
      });

    els.outlinerTableBody.appendChild(row);
  });
}

async function openOutlinerModal() {
  if (!els.outlinerModal) return;

  els.outlinerModal.classList.remove('hidden');
  
   syncOutlinerViewModeClass();

  await renderOutliner();
}

function closeOutlinerModal() {
  if (!els.outlinerModal) return;

  els.outlinerModal.classList.add('hidden');
}

function getDefaultStatusForDoc(doc) {
  const type = doc?.docType || 'general';

  if (
    type === 'cover' ||
    type === 'notes' ||
    type === 'research' ||
    type === 'pdf'
  ) {
    return '';
  }

  return 'Drafting';
}

function normalizeStatus(status = '') {
  return String(status || '').trim();
}

function getStatusClass(status = '') {
  const normalized =
    normalizeStatus(status)
      .toLowerCase()
      .replace(/\s+/g, '-');

  return normalized
    ? `status-${normalized}`
    : 'status-none';
}

function getStatusDot(status = '') {
  const normalized =
    normalizeStatus(status);

  if (normalized === 'Idea') return '⚪';
  if (normalized === 'Drafting') return '🔵';
  if (normalized === 'Needs Rewrite') return '🟠';
  if (normalized === 'Revising') return '🟣';
  if (normalized === 'Final') return '🟢';
  if (normalized === 'Reference') return '⚫';

  return '';
}

function renderSidebarStatusDot(status = '') {
  const safeStatus = normalizeStatus(status);

  if (!safeStatus) {
    return '';
  }

  const statusClass = getStatusClass(safeStatus);

  return `
    <span
      class="sidebar-status-dot ${statusClass}"
      title="${escapeHtml(safeStatus)}"
      aria-label="${escapeHtml(safeStatus)}"
    ></span>
  `;
}

function renderStatusChip(status = '') {
  const safeStatus = normalizeStatus(status);

  if (!safeStatus) {
    return '';
  }

  return `
    <span class="status-chip ${getStatusClass(safeStatus)}">
      <span class="status-chip-label">${escapeHtml(safeStatus)}</span>
    </span>
  `;
}

function getDocumentFolderName(doc) {
  const folder =
    String(doc?.folder || '').trim();

  return folder || 'Unfiled';
}

function getFolderNamesFromDocuments(documents = []) {
  const folders =
    new Set();

  documents.forEach(doc => {
    folders.add(getDocumentFolderName(doc));
  });

  return Array.from(folders).sort((a, b) => {
    if (a === 'Unfiled') return 1;
    if (b === 'Unfiled') return -1;

    return a.localeCompare(b);
  });
}

function getFolderFilteredDocuments(documents = []) {
  if (!activeFolderFilter) {
    return documents;
  }

  const byId = new Map();
  const childrenByParent = new Map();

  documents.forEach(doc => {
    byId.set(doc.id, doc);

    const key = doc.parentId || 'root';

    if (!childrenByParent.has(key)) {
      childrenByParent.set(key, []);
    }

    childrenByParent.get(key).push(doc);
  });

  const directlyMatched = documents.filter(doc => {
    return getDocumentFolderName(doc) === activeFolderFilter;
  });

  const includeIds = new Set();

  function includeDescendants(docId) {
    const children = childrenByParent.get(docId) || [];

    children.forEach(child => {
      includeIds.add(child.id);
      includeDescendants(child.id);
    });
  }

  function includeAncestors(doc) {
    let current = doc;

    while (current?.parentId) {
      const parent = byId.get(current.parentId);

      if (!parent) break;

      includeIds.add(parent.id);
      current = parent;
    }
  }

  directlyMatched.forEach(doc => {
    includeIds.add(doc.id);

    /*
      If the document itself is foldered and has children,
      show its children underneath it. This makes foldering
      a manuscript/parent doc behave like a grouped project view.
    */
    includeDescendants(doc.id);

    /*
      If only a subdoc is foldered, parent context is optional.
      Context OFF = show the subdoc by itself.
      Context ON = show parent chain above it.
    */
    if (showFolderParentContext) {
      includeAncestors(doc);
    }
  });

  const filtered = documents.filter(doc => {
    return includeIds.has(doc.id);
  });

  const visibleIds = new Set(filtered.map(doc => doc.id));

  /*
    If a visible doc's parent is not visible, show that doc at root
    level for this filtered view. This keeps separately-foldered
    subdocs accessible without forcing the parent to appear.
  */
  return filtered.map(doc => {
    if (!doc.parentId) {
      return doc;
    }

    if (visibleIds.has(doc.parentId)) {
      return doc;
    }

    return {
      ...doc,
      parentId: null
    };
  });
}

function renderFolderShelf(documents = []) {
  if (!els.documentList) return;

  const folders = getFolderNamesFromDocuments(documents);

  const shelf = document.createElement('div');
  shelf.className = 'folder-filter-row';

  const label = document.createElement('label');
  label.className = 'folder-filter-label';
  label.textContent = 'Folder';

  const select = document.createElement('select');
  select.className = 'folder-filter-select';

  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All Documents';
  select.appendChild(allOption);

  folders.forEach(folder => {
    const option = document.createElement('option');

    option.value = folder;
    option.textContent = folder;

    select.appendChild(option);
  });

  select.value = activeFolderFilter || '';

  select.onchange = event => {
    activeFolderFilter = event.target.value || null;
    renderDocumentList(documentsCache);
  };

  const count = document.createElement('span');
  count.className = 'folder-filter-count';

  const visibleDocs = getFolderFilteredDocuments(documents);

  count.textContent =
    `${visibleDocs.length} ${visibleDocs.length === 1 ? 'doc' : 'docs'}`;

  const contextLabel = document.createElement('label');
  contextLabel.className = 'folder-context-toggle';

  const contextInput = document.createElement('input');
  contextInput.type = 'checkbox';
  contextInput.checked = showFolderParentContext;

  contextInput.onchange = event => {
    showFolderParentContext = Boolean(event.target.checked);
    renderDocumentList(documentsCache);
  };

  const contextText = document.createElement('span');
  contextText.textContent = 'Context';

  contextLabel.appendChild(contextInput);
  contextLabel.appendChild(contextText);

  shelf.appendChild(label);
  shelf.appendChild(select);
  shelf.appendChild(count);

  if (activeFolderFilter) {
    shelf.appendChild(contextLabel);
  }

  els.documentList.appendChild(shelf);
}

function renderDocumentList(documents) {
  if (!els.documentList) return;

  const allDocuments =
    Array.isArray(documents)
      ? documents
      : [];

  const displayDocuments =
    getFolderFilteredDocuments(allDocuments);

  els.documentList.innerHTML = '';

  renderFolderShelf(allDocuments);

  if (!displayDocuments.length) {
    const empty =
      document.createElement('div');

    empty.className = 'empty-note';

    empty.textContent = activeFolderFilter
      ? `No documents in ${activeFolderFilter}.`
      : 'No documents yet.';

    els.documentList.appendChild(empty);
    return;
  }

  const byParent = new Map();
  const byId = new Map();

 displayDocuments.forEach(doc => {
    byId.set(doc.id, doc);

    const key = doc.parentId || 'root';

    if (!byParent.has(key)) {
      byParent.set(key, []);
    }

    byParent.get(key).push(doc);
  });

  function sortDocs(list) {
    return list.slice().sort((a, b) => {
      const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : null;
      const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : null;

      if (orderA !== null && orderB !== null) {
        return orderA - orderB;
      }

      const chapterA = getChapterNumberFromTitle(a.title);
      const chapterB = getChapterNumberFromTitle(b.title);

      if (chapterA !== null && chapterB !== null) {
        return chapterA - chapterB;
      }

      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  function renderGroup(parentId = 'root', depth = 0) {
    const group = sortDocs(byParent.get(parentId) || []);

    group.forEach(doc => {
      const children = byParent.get(doc.id) || [];
      const hasChildren = children.length > 0;
      const isCollapsed = collapsedDocIds.has(doc.id);

      const card = document.createElement('div');

      card.className = [
        'doc-card',
        doc.id === currentDocumentId ? 'active' : '',
        depth > 0 ? 'nested-doc' : '',
        `depth-${Math.min(depth, 3)}`,
        doc.docType ? `type-${doc.docType}` : ''
      ].filter(Boolean).join(' ');

      card.dataset.id = doc.id;

      const words = Number(doc.wordCount || 0);
      const updated = formatDate(doc.updatedAt);

      const typeLabel =
            doc.docType === 'cover' ? 'Cover' :
doc.docType === 'body-matter' ? 'Body Matter' :
  doc.docType === 'chapter' ? 'Chapter' :
  doc.docType === 'manuscript' ? 'Manuscript' :
  doc.docType === 'front-matter' ? 'Front Matter' :
  doc.docType === 'back-matter' ? 'Back Matter' :
  doc.docType === 'pdf' ? 'Imported PDF' :
  doc.docType === 'research' ? 'Research' :
  doc.docType === 'notes' ? 'Notes' :
  doc.docType === 'general' ? 'General' :
  doc.docType === 'subdocument' ? 'Subdoc' :
  'Doc';

      const parentDoc =
        doc.parentId
          ? byId.get(doc.parentId)
          : null;
      
      const parentLabel =
  parentDoc
    ? `${parentDoc.title || 'Untitled'} • `
    : activeFolderFilter
      ? ''
      : doc.folder
        ? `📁 ${doc.folder} • `
        : '';
      
      const docStatus =
  doc.status !== undefined && doc.status !== null
    ? doc.status
    : getDefaultStatusForDoc(doc);

const statusChip =
  renderStatusChip(docStatus);

const sidebarStatusDot =
  renderSidebarStatusDot(docStatus);
      
      const splitLabel =
  doc.splitPaneDocId
    ? getDocumentTitleById(doc.splitPaneDocId, documentsCache)
    : '';

const splitIndicator =
  splitLabel
    ? `<div class="doc-card-split-indicator">Split: ${escapeHtml(splitLabel)}</div>`
    : '';
      
      const typeIcon =
  getDocumentTypeIcon(doc);
      
      const sourceCount =
  Array.isArray(doc.sources)
    ? doc.sources.length
    : 0;

const sourceIndicator =
  doc.docType === 'research' && sourceCount
    ? `<div class="doc-card-extra">🔬 ${sourceCount} source${sourceCount === 1 ? '' : 's'}</div>`
    : '';
      
      const docCollections =
  getCollectionsForDocument(collectionsCache, doc.id);

const collectionIndicator =
  docCollections.length
    ? `<div class="doc-card-extra">🗂 ${docCollections.map(collection => escapeHtml(collection.name)).join(', ')}</div>`
    : '';

      card.innerHTML = `
  <div class="doc-card-topline">
    ${
      hasChildren
        ? `<button class="doc-collapse-btn" data-collapse-id="${escapeHtml(doc.id)}">${isCollapsed ? '▸' : '▾'}</button>`
        : `<span class="doc-collapse-spacer"></span>`
    }

    <div class="doc-card-title">
      <span class="doc-type-icon type-${escapeHtml(doc.docType || 'general')}">
        ${escapeHtml(typeIcon)}
      </span>

      <span class="doc-card-title-text">
        ${escapeHtml(doc.title || 'Untitled Document')}
      </span>

      ${sidebarStatusDot}
    </div>
  </div>

  ${splitIndicator}
  ${sourceIndicator}
  ${collectionIndicator}

  ${
    doc.pov
      ? `<div class="doc-card-extra">POV: ${escapeHtml(doc.pov)}</div>`
      : ''
  }

  <div class="doc-card-meta">
    ${escapeHtml(parentLabel)}${escapeHtml(typeLabel)} • ${words} ${words === 1 ? 'word' : 'words'} • ${escapeHtml(updated)}
  </div>
`;

      card.onclick = event => {
        const collapseButton = event.target.closest('[data-collapse-id]');

        if (collapseButton) {
          event.stopPropagation();
          toggleDocCollapsed(collapseButton.dataset.collapseId);
          return;
        }

        openDocument(doc.id);
      };

      els.documentList.appendChild(card);

      if (!isCollapsed) {
        renderGroup(doc.id, depth + 1);
      }
    });
  }

  renderGroup();
}

async function applyCurrentStatusToSubdocs() {
  if (!currentDocumentId) return;

  const current =
    await NaviStorage.getDocument(currentDocumentId);

  if (!current) return;

  const status =
    els.docStatusSelect?.value || '';

  const allDocs =
    await NaviStorage.getAllDocuments();

  const descendantIds =
    getDescendantDocumentIds(currentDocumentId, allDocs);

  if (!descendantIds.length) {
    showAppNotice(
      'This document has no subdocuments.',
      'No subdocs found'
    );
    return;
  }

  const statusLabel =
    status || 'None';

  const ok =
    await openConfirmModal({
      title: 'Apply Status to Subdocs',
      message:
        `Apply "${statusLabel}" to ${descendantIds.length} subdocument${descendantIds.length === 1 ? '' : 's'} under "${current.title || 'Untitled Document'}"?`,
      confirmText: 'Apply',
      cancelText: 'Cancel',
      danger: false
    });

  if (!ok) return;

  for (const id of descendantIds) {
    const doc =
      await NaviStorage.getDocument(id);

    if (!doc) continue;

    await NaviStorage.saveDocument({
      ...doc,
      status,
      updatedAt: Date.now()
    });
  }

  await loadDocuments();

  NaviEditor.setSaveStatus('Status applied to subdocs');
}

function getFrequentWordsFromText(text, limit = 10) {
  const stopWords = new Set([
    'the','and','but','for','are','was','were','with','that','this','from',
    'you','your','her','his','they','them','she','him','had','has','have',
    'not','all','out','who','what','when','where','why','how','into','over',
    'there','their','then','than','too','very','just','like','said','says',
    'can','could','would','should','will','shall','did','does','done','been',
    'being','about','after','before','because','through'
  ]);

  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/gi, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !stopWords.has(word));

  const map = new Map();

  words.forEach(word => {
    map.set(word, (map.get(word) || 0) + 1);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({
      text,
      count
    }));
}

function clearActiveFindHighlight() {
  if (window.CSS && CSS.highlights) {
    CSS.highlights.delete('navi-find-active');
  }
}

function showActiveFindHighlight(range, fallbackElement) {
  clearActiveFindHighlight();

  if (window.CSS && CSS.highlights && window.Highlight) {
    const highlight = new Highlight(range);
    CSS.highlights.set('navi-find-active', highlight);

    setTimeout(() => {
      clearActiveFindHighlight();
    }, 1800);

    return;
  }

  flashFindResult(fallbackElement);
}

function getFrequentPhrasesFromText(text, size = 3, limit = 10) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/gi, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2);

  const map = new Map();

  for (let i = 0; i <= words.length - size; i++) {
    const phrase = words.slice(i, i + size).join(' ');

    if (!phrase.trim()) continue;

    map.set(phrase, (map.get(phrase) || 0) + 1);
  }

  return Array.from(map.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, count]) => ({
      text,
      count
    }));
}

async function getAnalysisText() {
  const scope =
    els.analysisScopeSelect?.value || 'current';

  if (scope === 'project') {
    const projectStats = await getCurrentProjectStats();

    return projectStats.docs
      .map(doc => getDocPlainTextForStats(doc))
      .join('\n\n');
  }

  return NaviEditor.getEditorText();
}

async function findOccurrencesAcrossProject(query) {
  const projectStats = await getCurrentProjectStats();

  if (!projectStats.docs.length) {
    return [];
  }

  const results = [];

  projectStats.docs.forEach(doc => {
    const text = getDocPlainTextForStats(doc);

    const occurrences = findOccurrencesInText(
      text,
      query,
      8
    );

    occurrences.forEach(occurrence => {
      results.push({
        ...occurrence,
        docId: doc.id,
        docTitle: doc.title || 'Untitled Document',
        scope: 'project'
      });
    });
  });

  return results;
}

function getFindScope() {
  return els.floatingFindScopeSelect?.value || 'current';
}

function applyDocumentTypePreset(doc) {
  const type =
    doc?.docType || 'standard';

  document.body.classList.remove(
    'doc-type-standard',
    'doc-type-manuscript',
    'doc-type-chapter',
    'doc-type-front-matter',
    'doc-type-back-matter',
    'doc-type-body-matter',
    'doc-type-cover',
    'doc-type-notes',
    'doc-type-research',
    'doc-type-pdf',
    'doc-type-general'
  );

  document.body.classList.add(`doc-type-${type}`);

  if (!els.docTitle) {
    return;
  }

  if (type === 'chapter') {
    els.docTitle.placeholder = 'Chapter title...';
  } else if (type === 'front-matter') {
    els.docTitle.placeholder = 'Front matter title...';
  } else if (type === 'back-matter') {
    els.docTitle.placeholder = 'Back matter title...';
  } else if (type === 'body-matter') {
    els.docTitle.placeholder = 'Body matter title...';
  } else if (type === 'cover') {
    els.docTitle.placeholder = 'Cover title...';
  } else if (type === 'notes') {
    els.docTitle.placeholder = 'Notes title...';
  } else if (type === 'research') {
    els.docTitle.placeholder = 'Research title...';
  } else if (type === 'pdf') {
    els.docTitle.placeholder = 'PDF title...';
  } else {
    els.docTitle.placeholder = 'Untitled Document';
  }
}

function createEmptyBoard() {
  return {
    items: []
  };
}

function normalizeBoardData(board) {
  if (!board || !Array.isArray(board.items)) {
    return {
      items: [],
      connectors: [],
      canvas: {
        width: 5000,
        height: 3500
      }
    };
  }

  return {
    items: board.items.map(item => ({
      id: item.id || crypto.randomUUID(),
      type: item.type || 'note',
      x: Number(item.x || 40),
      y: Number(item.y || 40),
      width: Number(item.width || 220),
      height: Number(item.height || 140),
      text: item.text || '',
      src: item.src || '',
      title: item.title || '',
      url: item.url || '',
      docId: item.docId || '',
      name: item.name || '',
      role: item.role || '',
      notes: item.notes || '',
      color: item.color || '#fff8b5',
      zIndex: Number(item.zIndex || 2),
      fontSize: Number(item.fontSize || 13),
    })),

    connectors: Array.isArray(board.connectors)
  ? board.connectors.map(connector => ({
      id: connector.id || crypto.randomUUID(),
      fromId: connector.fromId || '',
      toId: connector.toId || '',
      label: connector.label || '',
      type: connector.type || 'straight'
    }))
  : [],

    canvas: {
      width: Number(board.canvas?.width || 5000),
      height: Number(board.canvas?.height || 3500)
    }
  };
}

function getBoardSnapshot() {
  return normalizeBoardData(currentBoardData);
}

function updateWorkspaceModeButtons(mode = 'write') {
  if (els.writeModeBtn) {
    els.writeModeBtn.classList.toggle('active', mode === 'write');
  }

  if (els.boardModeBtn) {
    els.boardModeBtn.classList.toggle('active', mode === 'board');
  }

  if (els.sourcesModeBtn) {
    els.sourcesModeBtn.classList.toggle('active', mode === 'sources');
  }
}

function setSourcesMode(enabled) {
  const isSources =
    Boolean(enabled);

  document.body.classList.toggle(
    'sources-mode-active',
    isSources
  );

  if (isSources) {
    /*
      Do NOT call setBoardMode(false) here, because setBoardMode(false)
      marks Write active. We only need to leave board mode quietly.
    */
    document.body.classList.remove('board-mode-active');
    boardConnectMode = false;
    boardConnectStartId = null;
    document.body.classList.remove('board-connect-mode');

    if (els.connectBoardItemsBtn) {
      els.connectBoardItemsBtn.classList.remove('active');
      els.connectBoardItemsBtn.textContent = 'Connect';
    }

    updateWorkspaceModeButtons('sources');
    renderSourcesPanel();
  } else {
    updateWorkspaceModeButtons('write');
  }
}

function exitSourcesMode() {
  setSourcesMode(false);
}

function setBoardMode(enabled) {
  const isBoard = Boolean(enabled);
  
  if (isBoard) {
  document.body.classList.remove('sources-mode-active');

  if (els.sourcesModeBtn) {
    els.sourcesModeBtn.classList.remove('active');
  }
}
  
  if (!isBoard) {
  hideBoardMinimap();
}

  document.body.classList.toggle('board-mode-active', isBoard);

 updateWorkspaceModeButtons(isBoard ? 'board' : 'write');

  if (isBoard) {
    renderBoard();
  } else {
    boardConnectMode = false;
    boardConnectStartId = null;
    hideBoardMinimap();

    document.body.classList.remove('board-connect-mode');

    if (els.connectBoardItemsBtn) {
      els.connectBoardItemsBtn.classList.remove('active');
      els.connectBoardItemsBtn.textContent = 'Connect';
    }
  }
}

async function renderSourcesPanel() {
  if (!els.sourcesList) return;

  if (!currentDocumentId) {
    els.sourcesList.innerHTML = `
      <div class="empty-note">Open a research document first.</div>
    `;
    return;
  }

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) {
    els.sourcesList.innerHTML = `
      <div class="empty-note">Document not found.</div>
    `;
    return;
  }

  if (!isResearchDocument(doc)) {
    els.sourcesList.innerHTML = `
      <div class="empty-note">
        Sources are available for Research documents.
      </div>
    `;
    return;
  }

  const sources =
    getCurrentSourceList(doc);

  if (!sources.length) {
    els.sourcesList.innerHTML = `
      <div class="empty-note">
        No sources yet. Add links, articles, books, videos, or reference notes here.
      </div>
    `;
    return;
  }

  els.sourcesList.innerHTML = '';

  sources
    .slice()
    .sort((a, b) => {
      return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    })
    .forEach(source => {
      const card =
        document.createElement('article');

      card.className = 'source-card';
      card.dataset.sourceId = source.id;

      const host =
        source.url
          ? getHostnameFromUrl(source.url)
          : '';

      const tags =
        Array.isArray(source.tags) && source.tags.length
          ? source.tags.map(tag => {
              return `<span class="source-tag">${escapeHtml(tag)}</span>`;
            }).join('')
          : '';

      card.innerHTML = `
        <div class="source-card-head">
          <div>
            <strong>${escapeHtml(source.title || 'Untitled Source')}</strong>
            <div class="source-card-meta">
              ${
                source.author
                  ? `<span>${escapeHtml(source.author)}</span>`
                  : ''
              }
              ${
                source.dateAccessed
                  ? `<span>${escapeHtml(formatSourceDate(source.dateAccessed))}</span>`
                  : ''
              }
              ${
                host
                  ? `<span>${escapeHtml(host)}</span>`
                  : ''
              }
            </div>
          </div>

          <div class="source-card-actions">
            ${
              source.url
                ? `<button class="source-open-btn">Open</button>`
                : ''
            }
            <button class="source-edit-btn">Edit</button>
            <button class="source-delete-btn">Delete</button>
          </div>
        </div>

        ${
  source.url
    ? `
      <a
        class="source-url"
        href="${escapeHtml(normalizeExternalUrl(source.url))}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${escapeHtml(source.url)}
      </a>
    `
    : ''
}

        ${
          source.notes
            ? `<p class="source-notes">${escapeHtml(source.notes)}</p>`
            : ''
        }

        ${
          tags
            ? `<div class="source-tags">${tags}</div>`
            : ''
        }
      `;

      card.querySelector('.source-open-btn')?.addEventListener('click', event => {
        event.stopPropagation();

        if (source.url) {
          window.open(
            normalizeExternalUrl(source.url),
            '_blank',
            'noopener,noreferrer'
          );
        }
      });

      card.querySelector('.source-edit-btn')?.addEventListener('click', event => {
        event.stopPropagation();
        openSourceModal(source);
      });

      card.querySelector('.source-delete-btn')?.addEventListener('click', async event => {
        event.stopPropagation();
        await deleteSource(source.id);
      });

      els.sourcesList.appendChild(card);
    });
}

async function saveSourcesForCurrentDocument(sources) {
  if (!currentDocumentId) return;

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) return;

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      sources: normalizeSourceList(sources),
      updatedAt: Date.now()
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  await renderSourcesPanel();
  renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Sources saved');
}

function openSourceModal(source = null) {
  if (!els.sourceModal) return;

  editingSourceId =
    source?.id || null;

  if (els.sourceModalTitle) {
    els.sourceModalTitle.textContent =
      editingSourceId ? 'Edit Source' : 'Add Source';
  }

  if (els.sourceTitleInput) {
    els.sourceTitleInput.value = source?.title || '';
  }

  if (els.sourceUrlInput) {
    els.sourceUrlInput.value = source?.url || '';
  }

  if (els.sourceAuthorInput) {
    els.sourceAuthorInput.value = source?.author || '';
  }

  if (els.sourceDateInput) {
    els.sourceDateInput.value = source?.dateAccessed || '';
  }

  if (els.sourceTagsInput) {
    els.sourceTagsInput.value = Array.isArray(source?.tags)
      ? source.tags.join(', ')
      : '';
  }

  if (els.sourceNotesInput) {
    els.sourceNotesInput.value = source?.notes || '';
  }

  if (els.submitSourceModalBtn) {
    els.submitSourceModalBtn.textContent =
      editingSourceId ? 'Save Source' : 'Add Source';
  }

  els.sourceModal.classList.remove('hidden');

  setTimeout(() => {
    els.sourceTitleInput?.focus();
  }, 0);
}

function closeSourceModal() {
  editingSourceId = null;

  if (els.sourceModal) {
    els.sourceModal.classList.add('hidden');
  }
}

async function submitSourceModal() {
  if (!currentDocumentId) return;

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) return;

  if (!isResearchDocument(doc)) {
    showAppNotice(
      'Sources are only available for Research documents.',
      'Not a research document'
    );
    return;
  }

  const title =
    els.sourceTitleInput?.value.trim() || 'Untitled Source';

  const url =
    els.sourceUrlInput?.value.trim() || '';

  const nextSource = {
    id: editingSourceId || crypto.randomUUID(),
    title,
    url,
    author: els.sourceAuthorInput?.value.trim() || '',
    dateAccessed: els.sourceDateInput?.value || '',
    tags: parseTags(els.sourceTagsInput?.value || ''),
    notes: els.sourceNotesInput?.value.trim() || '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const sources =
    getCurrentSourceList(doc);

  const existingIndex =
    sources.findIndex(source => {
      return source.id === editingSourceId;
    });

  if (existingIndex >= 0) {
    nextSource.createdAt =
      sources[existingIndex].createdAt || Date.now();

    sources[existingIndex] = nextSource;
  } else {
    sources.push(nextSource);
  }

  closeSourceModal();

  await saveSourcesForCurrentDocument(sources);
}

async function deleteSource(sourceId) {
  if (!currentDocumentId || !sourceId) return;

  const ok =
    await openConfirmModal({
      title: 'Delete Source',
      message: 'Delete this research source?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

  if (!ok) return;

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) return;

  const sources =
    getCurrentSourceList(doc)
      .filter(source => source.id !== sourceId);

  await saveSourcesForCurrentDocument(sources);
}

function getBoardCanvasBounds() {
  const items =
    Array.isArray(currentBoardData.items)
      ? currentBoardData.items
      : [];

  const canvas =
    currentBoardData.canvas || {
      width: 5000,
      height: 3500
    };

  let maxX =
    Number(canvas.width || 5000);

  let maxY =
    Number(canvas.height || 3500);

  items.forEach(item => {
    maxX =
      Math.max(
        maxX,
        Number(item.x || 0) + Number(item.width || 220) + 300
      );

    maxY =
      Math.max(
        maxY,
        Number(item.y || 0) + Number(item.height || 140) + 300
      );
  });

  return {
    width: maxX,
    height: maxY
  };
}

function renderBoardMinimap() {
  if (
    !els.boardMinimap ||
    els.boardMinimap.classList.contains('hidden') ||
    !els.boardMinimapBody ||
    !els.boardMinimapWorld ||
    !els.boardMinimapViewport ||
    !els.boardSurface
  ) {
    return;
  }

  const bounds =
    getBoardCanvasBounds();

  const bodyRect =
    els.boardMinimapBody.getBoundingClientRect();

  const padding =
    8;

  const scaleX =
    (bodyRect.width - padding * 2) /
    Math.max(1, bounds.width);

  const scaleY =
    (bodyRect.height - padding * 2) /
    Math.max(1, bounds.height);

  boardMinimapScale =
    Math.max(
      0.01,
      Math.min(scaleX, scaleY)
    );

  const worldWidth =
    bounds.width * boardMinimapScale;

  const worldHeight =
    bounds.height * boardMinimapScale;

  els.boardMinimapWorld.style.width =
    `${worldWidth}px`;

  els.boardMinimapWorld.style.height =
    `${worldHeight}px`;

  els.boardMinimapWorld.style.left =
    `${padding}px`;

  els.boardMinimapWorld.style.top =
    `${padding}px`;

  els.boardMinimapWorld.innerHTML = '';

  const items =
    Array.isArray(currentBoardData.items)
      ? currentBoardData.items
      : [];

  items.forEach(item => {
    const node =
      document.createElement('div');

    node.className = [
      'board-minimap-item',
      item.id === activeBoardItemId ? 'active' : '',
      item.type ? `type-${item.type}` : ''
    ]
      .filter(Boolean)
      .join(' ');

    node.style.left =
      `${Number(item.x || 0) * boardMinimapScale}px`;

    node.style.top =
      `${Number(item.y || 0) * boardMinimapScale}px`;

    node.style.width =
      `${Math.max(4, Number(item.width || 220) * boardMinimapScale)}px`;

    node.style.height =
      `${Math.max(4, Number(item.height || 140) * boardMinimapScale)}px`;

    els.boardMinimapWorld.appendChild(node);
  });

  updateBoardMinimapViewport();
}

function updateBoardMinimapViewport() {
  if (
    !els.boardMinimap ||
    els.boardMinimap.classList.contains('hidden') ||
    !els.boardMinimapViewport ||
    !els.boardSurface
  ) {
    return;
  }

  const scrollLeft =
    els.boardSurface.scrollLeft || 0;

  const scrollTop =
    els.boardSurface.scrollTop || 0;

  const viewportWidth =
    els.boardSurface.clientWidth || 1;

  const viewportHeight =
    els.boardSurface.clientHeight || 1;

  els.boardMinimapViewport.style.left =
    `${8 + (scrollLeft / boardZoom) * boardMinimapScale}px`;

  els.boardMinimapViewport.style.top =
    `${8 + (scrollTop / boardZoom) * boardMinimapScale}px`;

  els.boardMinimapViewport.style.width =
    `${Math.max(12, (viewportWidth / boardZoom) * boardMinimapScale)}px`;

  els.boardMinimapViewport.style.height =
    `${Math.max(12, (viewportHeight / boardZoom) * boardMinimapScale)}px`;
}

function panBoardToMinimapPoint(clientX, clientY) {
  if (
    !els.boardMinimapBody ||
    !els.boardSurface
  ) {
    return;
  }

  const rect =
    els.boardMinimapBody.getBoundingClientRect();

  const localX =
    clientX - rect.left - 8;

  const localY =
    clientY - rect.top - 8;

  const boardX =
    localX / boardMinimapScale;

  const boardY =
    localY / boardMinimapScale;

  els.boardSurface.scrollLeft =
    Math.max(
      0,
      boardX * boardZoom - els.boardSurface.clientWidth / 2
    );

  els.boardSurface.scrollTop =
    Math.max(
      0,
      boardY * boardZoom - els.boardSurface.clientHeight / 2
    );

  updateBoardMinimapViewport();
}



function renderBoard() {
  if (!els.boardSurface) return;

  els.boardSurface.innerHTML = '';

  currentBoardData = normalizeBoardData(currentBoardData);

  expandBoardCanvasToFitItems();

  const scaledWidth = currentBoardData.canvas.width * boardZoom;
  const scaledHeight = currentBoardData.canvas.height * boardZoom;

  const viewport = document.createElement('div');
  viewport.className = 'board-canvas-viewport';
  viewport.style.width = `${scaledWidth}px`;
  viewport.style.height = `${scaledHeight}px`;

  const world = document.createElement('div');
  world.className = 'board-canvas-world';
  world.style.width = `${currentBoardData.canvas.width}px`;
  world.style.height = `${currentBoardData.canvas.height}px`;
  world.style.transform = `scale(${boardZoom})`;

  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  );

  svg.id = 'boardConnectorsLayer';
  svg.classList.add('board-connectors-layer');
  svg.setAttribute('width', currentBoardData.canvas.width);
  svg.setAttribute('height', currentBoardData.canvas.height);

  world.appendChild(svg);

  currentBoardData.items.forEach(item => {
    const node = createBoardItemElement(item);
    world.appendChild(node);
  });

  viewport.appendChild(world);
  els.boardSurface.appendChild(viewport);

  renderBoardConnectors(svg);
  updateBoardConnectModeUI();
  updateBoardZoomLabel();
  renderBoardMinimap();
}


function expandBoardCanvasToFitItems() {
  const padding = 900;

  let maxX = 5000;
  let maxY = 3500;

  currentBoardData.items.forEach(item => {
    maxX = Math.max(maxX, item.x + item.width + padding);
    maxY = Math.max(maxY, item.y + item.height + padding);
  });

  currentBoardData.canvas.width = maxX;
  currentBoardData.canvas.height = maxY;
}

function getBoardItemCenter(item) {
  return {
    x: item.x + item.width / 2,
    y: item.y + item.height / 2
  };
}

function getConnectorPath(start, end, type = 'straight') {
  if (type === 'curve') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const curveOffset = Math.max(
      80,
      Math.min(260, Math.abs(dx) * 0.35)
    );

    return [
      `M ${start.x} ${start.y}`,
      `C ${start.x + curveOffset} ${start.y}`,
      `${end.x - curveOffset} ${end.y}`,
      `${end.x} ${end.y}`
    ].join(' ');
  }

  if (type === 'elbow') {
    const midX = (start.x + end.x) / 2;

    return [
      `M ${start.x} ${start.y}`,
      `L ${midX} ${start.y}`,
      `L ${midX} ${end.y}`,
      `L ${end.x} ${end.y}`
    ].join(' ');
  }

  return [
    `M ${start.x} ${start.y}`,
    `L ${end.x} ${end.y}`
  ].join(' ');
}

function getConnectorLabelPosition(start, end) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - 8
  };
}

function renderBoardConnectors(svg) {
  if (!svg) return;

  const itemMap = new Map();

  currentBoardData.items.forEach(item => {
    itemMap.set(item.id, item);
  });

  currentBoardData.connectors.forEach(connector => {
    const from = itemMap.get(connector.fromId);
    const to = itemMap.get(connector.toId);

    if (!from || !to) return;

    const start = getBoardItemCenter(from);
    const end = getBoardItemCenter(to);

    const path = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );

    path.setAttribute(
      'd',
      getConnectorPath(start, end, connector.type)
    );

    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', getBoardConnectorColor(connector));
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);

    if (connector.label) {
      const labelPosition = getConnectorLabelPosition(
        start,
        end
      );

      const text = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );

      text.classList.add('board-connector-label');

      text.setAttribute('x', labelPosition.x);
      text.setAttribute('y', labelPosition.y);
      text.setAttribute('text-anchor', 'middle');

      text.textContent = connector.label;

      svg.appendChild(text);
    }
  });
}

function updateBoardConnectorPositions() {
  const svg = document.getElementById('boardConnectorsLayer');

  if (!svg) return;

  svg.innerHTML = '';

  renderBoardConnectors(svg);
  renderBoardMinimap();
}



function getConnectorPath(start, end, type = 'straight') {
  if (type === 'curve') {
    const distance = Math.abs(end.x - start.x);
    const curve = Math.max(80, distance * 0.35);

    return [
      `M ${start.x} ${start.y}`,
      `C ${start.x + curve} ${start.y}`,
      `${end.x - curve} ${end.y}`,
      `${end.x} ${end.y}`
    ].join(' ');
  }

  if (type === 'elbow') {
    const midX = (start.x + end.x) / 2;

    return [
      `M ${start.x} ${start.y}`,
      `L ${midX} ${start.y}`,
      `L ${midX} ${end.y}`,
      `L ${end.x} ${end.y}`
    ].join(' ');
  }

  return [
    `M ${start.x} ${start.y}`,
    `L ${end.x} ${end.y}`
  ].join(' ');
}

function getConnectorLabelPosition(start, end) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - 8
  };
}


function isBoardItemSelected(id) {
  return selectedBoardItemIds.has(id);
}

function updateBoardSelectionClasses() {
  if (!els.boardSurface) return;

  els.boardSurface
    .querySelectorAll('.board-item')
    .forEach(node => {
      const id = node.dataset.id;

      node.classList.toggle(
        'selected',
        Boolean(id && selectedBoardItemIds.has(id))
      );

      node.classList.toggle(
        'multi-selected',
        Boolean(id && selectedBoardItemIds.has(id) && selectedBoardItemIds.size > 1)
      );
    });
}

function clearBoardSelection() {
  selectedBoardItemIds.clear();
  activeBoardItemId = null;
  updateBoardSelectionClasses();
}

function selectBoardItem(id, additive = false) {
  if (!id) return;

  if (additive) {
    if (selectedBoardItemIds.has(id)) {
      selectedBoardItemIds.delete(id);
    } else {
      selectedBoardItemIds.add(id);
    }
  } else {
    selectedBoardItemIds.clear();
    selectedBoardItemIds.add(id);
  }

  activeBoardItemId =
    selectedBoardItemIds.has(id)
      ? id
      : Array.from(selectedBoardItemIds)[0] || null;

  updateBoardSelectionClasses();
}



function createBoardItemElement(item) {
  const el = document.createElement('div');

  el.className = [
    'board-item',
    selectedBoardItemIds.has(item.id) ? 'selected' : '',
selectedBoardItemIds.has(item.id) && selectedBoardItemIds.size > 1 ? 'multi-selected' : '',
    `board-item-${item.type}`
  ].filter(Boolean).join(' ');

  el.dataset.id = item.id;
  el.style.left = `${item.x}px`;
  el.style.top = `${item.y}px`;
  el.style.width = `${item.width}px`;
  el.style.minHeight = `${item.height}px`;
  el.style.zIndex = String(item.zIndex || 2);

  if (item.color) {
    el.style.background = item.color;
  }
  
  el.style.setProperty(
  '--board-card-font-size',
  `${Number(item.fontSize || 13)}px`
);

  const head = document.createElement('div');
  head.className = 'board-item-head';

  const badge = document.createElement('span');
  badge.className = [
    'board-card-badge',
    `board-card-badge-${item.type || 'note'}`
  ].join(' ');

  badge.textContent =
    item.type === 'image'
      ? 'Image'
      : item.type === 'person'
        ? 'Person'
        : item.type === 'link' && item.docId
          ? 'Doc Link'
          : item.type === 'link'
            ? 'Link'
            : 'Note';

  head.appendChild(badge);

  if (item.type === 'person') {
    const editBtn = document.createElement('button');
    editBtn.className = 'board-item-edit';
    editBtn.title = 'Edit person';
    editBtn.textContent = '✎';
    head.appendChild(editBtn);
  }

  if (item.type === 'link' && !item.docId) {
    const editBtn = document.createElement('button');
    editBtn.className = 'board-item-edit board-link-edit';
    editBtn.title = 'Edit link';
    editBtn.textContent = '✎';
    head.appendChild(editBtn);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'board-item-delete';
  deleteBtn.title = 'Delete';
  deleteBtn.textContent = '×';

  head.appendChild(deleteBtn);
  el.appendChild(head);

  if (item.type === 'image') {
    const body = document.createElement('div');
    body.className = 'board-image-body';

    const img = document.createElement('img');
    img.src = item.src || '';
    img.alt = item.title || 'Board image';

    body.appendChild(img);
    el.appendChild(body);
  } else if (item.type === 'link') {
    const body = document.createElement('div');
    body.className = 'board-link-body';

    const title = document.createElement('div');
    title.className = 'board-link-title';
    title.textContent = item.title || 'Untitled link';

    body.appendChild(title);

    if (item.docId) {
      const button = document.createElement('button');
      button.className = 'board-doc-link-btn';
      button.dataset.docId = item.docId;
      button.textContent = 'Open linked document';

      body.appendChild(button);
    } else {
      const url = normalizeExternalUrl(item.url || '');
      const host = getHostnameFromUrl(url);

      const preview = document.createElement('div');
      preview.className = 'board-link-preview';

      const domain = document.createElement('div');
      domain.className = 'board-link-domain';
      domain.textContent = host || 'External link';

      const link = document.createElement('a');
      link.className = 'board-link-url';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = item.url || url;

      preview.appendChild(domain);
      preview.appendChild(link);
      body.appendChild(preview);
    }

    el.appendChild(body);
  } else if (item.type === 'person') {
    const body = document.createElement('div');
    body.className = 'board-person-body';

    const name = document.createElement('div');
    name.className = 'board-person-name';
    name.textContent = item.name || item.title || 'Unnamed Person';

    const role = document.createElement('div');
    role.className = 'board-person-role';
    role.textContent = item.role || 'Character';

    const notes = document.createElement('div');
    notes.className = 'board-person-notes';
    notes.textContent = item.notes || '';

    body.appendChild(name);
    body.appendChild(role);

    if (item.notes) {
      body.appendChild(notes);
    }

    el.appendChild(body);
  } else {
  const noteBody = document.createElement('div');

  noteBody.className = 'board-note-body';
  noteBody.contentEditable = 'true';
  noteBody.spellcheck = true;
  noteBody.textContent = item.text || '';

  el.appendChild(noteBody);
}

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'board-resize-handle';
  resizeHandle.title = 'Resize card';
  el.appendChild(resizeHandle);

  wireBoardItemEvents(el, item);

  return el;
}

function normalizeExternalUrl(url) {
  const value = String(url || '').trim();

  if (!value) return '#';

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('mailto:')
  ) {
    return value;
  }

  return `https://${value}`;
}

function getPersonBoardItems() {
  return currentBoardData.items.filter(item => {
    return item.type === 'person';
  });
}

async function chooseBoardPerson(title, subtitle, excludeIds = []) {
  const people =
    getPersonBoardItems()
      .filter(item => !excludeIds.includes(item.id));

  if (!people.length) {
    showAppNotice(
      'Add person cards first.',
      'No person cards'
    );
    return null;
  }

  const pickedId =
    await openChoiceModal({
      title,
      subtitle,
      options: people.map(item => ({
        value: item.id,
        icon: 'Person',
        title: item.name || item.title || 'Unnamed Person',
        desc: item.role || 'Character'
      }))
    });

  if (!pickedId) return null;

  return people.find(item => item.id === pickedId) || null;
}

async function createFamilyConnector() {
  const parentA =
    await chooseBoardPerson(
      'Family Link',
      'Choose the first parent / source person.'
    );

  if (!parentA) return;

  const parentB =
    await chooseBoardPerson(
      'Family Link',
      'Choose the second parent / source person.',
      [parentA.id]
    );

  if (!parentB) return;

  const child =
    await chooseBoardPerson(
      'Family Link',
      'Choose the child / target person.',
      [parentA.id, parentB.id]
    );

  if (!child) return;

  pushBoardUndoState();

  currentBoardData.connectors.push({
    id: crypto.randomUUID(),
    fromId: parentA.id,
    toId: child.id,
    label: 'Parent',
    type: 'elbow'
  });

  currentBoardData.connectors.push({
    id: crypto.randomUUID(),
    fromId: parentB.id,
    toId: child.id,
    label: 'Parent',
    type: 'elbow'
  });

  renderBoard();
  scheduleAutosave();

  NaviEditor.setSaveStatus('Family link added');
}

function connectBoardItems() {
  setBoardConnectMode(!boardConnectMode);
}

function setBoardConnectMode(enabled) {
  boardConnectMode = Boolean(enabled);
  boardConnectStartId = null;

  document.body.classList.toggle(
    'board-connect-mode',
    boardConnectMode
  );

  updateBoardConnectModeUI();
}

function updateBoardConnectModeUI() {
  if (els.connectBoardItemsBtn) {
    els.connectBoardItemsBtn.classList.toggle(
      'active',
      boardConnectMode
    );

    els.connectBoardItemsBtn.textContent =
      boardConnectMode
        ? 'Connecting...'
        : 'Connect';
  }

  if (!els.boardSurface) return;

  els.boardSurface
    .querySelectorAll('.board-item')
    .forEach(node => {
      node.classList.toggle(
        'connect-start',
        node.dataset.id === boardConnectStartId
      );
    });
}

async function handleBoardConnectionClick(itemId) {
  if (!boardConnectMode || !itemId) return;

  if (!boardConnectStartId) {
    boardConnectStartId = itemId;
    updateBoardConnectModeUI();
    return;
  }

  if (boardConnectStartId === itemId) {
    boardConnectStartId = null;
    updateBoardConnectModeUI();
    return;
  }

  const connection =
    await openBoardConnectionModal();

  if (!connection) {
    boardConnectStartId = null;
    updateBoardConnectModeUI();
    return;
  }

  pushBoardUndoState();

  currentBoardData.connectors.push({
    id: crypto.randomUUID(),
    fromId: boardConnectStartId,
    toId: itemId,
    label: connection.label || '',
    type: ['straight', 'curve', 'elbow'].includes(connection.type)
      ? connection.type
      : 'straight'
  });

  boardConnectStartId = null;
  setBoardConnectMode(false);
  renderBoard();
  scheduleAutosave();
}

function escapeSvgText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getReadableBoardType(type) {
  if (type === 'person') return 'Person';
  if (type === 'image') return 'Image';
  if (type === 'link') return 'Link';
  if (type === 'note') return 'Note';

  return String(type || 'Item')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getSvgCardText(item) {
  if (item.type === 'person') {
    return {
      title: item.name || item.title || 'Unnamed Person',
      meta: item.role || 'Character',
      body: item.notes || ''
    };
  }

  if (item.type === 'link') {
    return {
      title: item.title || 'Untitled Link',
      meta: item.docId ? 'Linked NaviWriter document' : getHostnameFromUrl(item.url || '') || 'External link',
      body: item.docId ? 'Open from NaviWriter board.' : item.url || ''
    };
  }

  if (item.type === 'image') {
    return {
      title: item.title || 'Image',
      meta: 'Board image',
      body: ''
    };
  }

  return {
    title: item.title || 'Note',
    meta: '',
    body: item.text || ''
  };
}

function getSvgExportItemLayout(item) {
  const width = Math.max(190, Number(item.width || 240));

  const text = getSvgCardText(item);

  const titleMaxChars = Math.max(18, Math.floor((width - 24) / 8));
  const bodyMaxChars = Math.max(24, Math.floor((width - 24) / 7));

  const titleLines = wrapSvgText(text.title, titleMaxChars, 3);
  const metaLines = wrapSvgText(text.meta, bodyMaxChars, 2);
  const bodyLines = wrapSvgText(text.body, bodyMaxChars, 6);

  const headerHeight = 28;
  const topPadding = 14;
  const titleLineHeight = 16;
  const metaLineHeight = 14;
  const bodyLineHeight = 14;
  const sectionGap = 7;
  const bottomPadding = 18;

  const neededHeight =
    headerHeight +
    topPadding +
    titleLines.length * titleLineHeight +
    (metaLines.length ? sectionGap + metaLines.length * metaLineHeight : 0) +
    (bodyLines.length ? sectionGap + bodyLines.length * bodyLineHeight : 0) +
    bottomPadding;

  const height = Math.max(
    Number(item.height || 140),
    neededHeight,
    item.type === 'person' ? 150 : 120
  );

  return {
    width,
    height,
    text,
    titleLines,
    metaLines,
    bodyLines
  };
}

function getBoardExportLayout(board) {
  const itemLayouts = new Map();

  board.items.forEach(item => {
    itemLayouts.set(item.id, getSvgExportItemLayout(item));
  });

  return itemLayouts;
}

function getBoardExportBounds(board, itemLayouts = null) {
  const padding = 80;

  if (!board.items.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: 1200,
      maxY: 800,
      width: 1200,
      height: 800
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  board.items.forEach(item => {
    const layout =
      itemLayouts?.get(item.id) ||
      getSvgExportItemLayout(item);

    const x = Number(item.x || 0);
    const y = Number(item.y || 0);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + layout.width);
    maxY = Math.max(maxY, y + layout.height);
  });

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function wrapSvgText(text, maxChars = 28, maxLines = 4) {
  const words =
    String(text || '')
      .split(/\s+/)
      .filter(Boolean);

  const lines = [];
  let current = '';

  words.forEach(word => {
    const next =
      current ? `${current} ${word}` : word;

    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function buildBoardExportSvg(title, board) {
  const safeTitle =
    escapeSvgText(title || 'Board');

  const itemLayouts =
    getBoardExportLayout(board);

  const bounds =
    getBoardExportBounds(board, itemLayouts);

  const offsetX =
    -bounds.minX;

  const offsetY =
    -bounds.minY;

  const itemMap =
    new Map();

  board.items.forEach(item => {
    itemMap.set(item.id, item);
  });

  const connectorsSvg =
    board.connectors.map(connector => {
      const from =
        itemMap.get(connector.fromId);

      const to =
        itemMap.get(connector.toId);

      if (!from || !to) return '';

      const fromLayout =
        itemLayouts.get(from.id) || getSvgExportItemLayout(from);

      const toLayout =
        itemLayouts.get(to.id) || getSvgExportItemLayout(to);

      const start = {
        x: Number(from.x || 0) + fromLayout.width / 2 + offsetX,
        y: Number(from.y || 0) + fromLayout.height / 2 + offsetY
      };

      const end = {
        x: Number(to.x || 0) + toLayout.width / 2 + offsetX,
        y: Number(to.y || 0) + toLayout.height / 2 + offsetY
      };

      const pathData =
        getConnectorPath(start, end, connector.type);

      const labelPosition =
        getConnectorLabelPosition(start, end);

      return `
        <path
          d="${escapeSvgText(pathData)}"
          fill="none"
          stroke="${escapeSvgText(getBoardConnectorColor(connector))}"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        ${
          connector.label
            ? `
              <text
                x="${labelPosition.x}"
                y="${labelPosition.y}"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="12"
                font-weight="800"
                fill="#ffffff"
                stroke="#111827"
                stroke-width="3"
                paint-order="stroke"
              >${escapeSvgText(connector.label)}</text>
            `
            : ''
        }
      `;
    }).join('\n');

  const itemsSvg =
    board.items.map(item => {
      const layout =
        itemLayouts.get(item.id) || getSvgExportItemLayout(item);

      const x =
        Number(item.x || 0) + offsetX;

      const y =
        Number(item.y || 0) + offsetY;

      const width =
        layout.width;

      const height =
        layout.height;

      const fill =
        item.color || '#fff8b5';

      const typeLabel =
        getReadableBoardType(item.type);

      let cursorY =
        y + 48;

      const titleSvg =
        layout.titleLines.map(line => {
          const output = `
            <text
              x="${x + 12}"
              y="${cursorY}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="14"
              font-weight="900"
              fill="${item.type === 'person' ? '#831843' : '#0f172a'}"
            >${escapeSvgText(line)}</text>
          `;

          cursorY += 16;

          return output;
        }).join('');

      if (layout.metaLines.length) {
        cursorY += 5;
      }

      const metaSvg =
        layout.metaLines.map(line => {
          const output = `
            <text
              x="${x + 12}"
              y="${cursorY}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="12"
              font-weight="700"
              fill="${item.type === 'person' ? '#9d174d' : '#475569'}"
            >${escapeSvgText(line)}</text>
          `;

          cursorY += 14;

          return output;
        }).join('');

      if (layout.bodyLines.length) {
        cursorY += 6;
      }

      const bodySvg =
        layout.bodyLines.map(line => {
          const output = `
            <text
              x="${x + 12}"
              y="${cursorY}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="12"
              fill="#111827"
            >${escapeSvgText(line)}</text>
          `;

          cursorY += 14;

          return output;
        }).join('');

      return `
        <g>
          <rect
            x="${x}"
            y="${y}"
            width="${width}"
            height="${height}"
            rx="14"
            fill="${escapeSvgText(fill)}"
            stroke="rgba(0,0,0,0.18)"
          />

          <rect
            x="${x}"
            y="${y}"
            width="${width}"
            height="28"
            rx="14"
            fill="rgba(0,0,0,0.08)"
          />

          <text
            x="${x + 10}"
            y="${y + 19}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="11"
            font-weight="900"
            fill="#111827"
          >${escapeSvgText(typeLabel)}</text>

          ${titleSvg}
          ${metaSvg}
          ${bodySvg}
        </g>
      `;
    }).join('\n');

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${bounds.width}"
      height="${bounds.height}"
      viewBox="0 0 ${bounds.width} ${bounds.height}"
    >
      <title>${safeTitle}</title>

      <defs>
        <pattern id="dotGrid" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#334155"/>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="#111827"/>
      <rect width="100%" height="100%" fill="url(#dotGrid)"/>

      ${connectorsSvg}
      ${itemsSvg}
    </svg>
  `.trim();
}

function getSvgSizeFromString(svgString) {
  const widthMatch =
    String(svgString || '').match(/\bwidth="([^"]+)"/i);

  const heightMatch =
    String(svgString || '').match(/\bheight="([^"]+)"/i);

  const width =
    widthMatch
      ? Number.parseFloat(widthMatch[1])
      : 0;

  const height =
    heightMatch
      ? Number.parseFloat(heightMatch[1])
      : 0;

  if (width > 0 && height > 0) {
    return {
      width,
      height
    };
  }

  const viewBoxMatch =
    String(svgString || '').match(/\bviewBox="([^"]+)"/i);

  if (viewBoxMatch) {
    const parts =
      viewBoxMatch[1]
        .split(/\s+/)
        .map(Number);

    if (parts.length === 4) {
      return {
        width: parts[2] || 1200,
        height: parts[3] || 800
      };
    }
  }

  return {
    width: 1200,
    height: 800
  };
}

function downloadBlobFile(fileName, blob) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function convertSvgStringToPngBlob(svgString) {
  return new Promise((resolve, reject) => {
    const size =
      getSvgSizeFromString(svgString);

    const svgBlob =
      new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8'
      });

    const svgUrl =
      URL.createObjectURL(svgBlob);

    const image =
      new Image();

    image.onload = () => {
      try {
        /*
          Browser canvas limits exist, especially on school laptops.
          This keeps huge boards from creating a ridiculous PNG.
        */
        const maxDimension =
          6000;

        const scale =
          Math.min(
            1,
            maxDimension / Math.max(size.width, size.height)
          );

        const canvas =
          document.createElement('canvas');

        canvas.width =
          Math.max(1, Math.round(size.width * scale));

        canvas.height =
          Math.max(1, Math.round(size.height * scale));

        const context =
          canvas.getContext('2d');

        if (!context) {
          throw new Error('Could not create PNG canvas.');
        }

        /*
          Give transparent areas a dark board background,
          matching the exported SVG board style.
        */
        context.fillStyle = '#111827';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob(blob => {
          URL.revokeObjectURL(svgUrl);

          if (!blob) {
            reject(new Error('PNG export failed.'));
            return;
          }

          resolve(blob);
        }, 'image/png');
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error('Could not render board SVG as PNG.'));
    };

    image.src =
      svgUrl;
  });
}

async function exportBoardPng() {
  try {
    const board =
      getBoardSnapshot();

    const title =
      NaviEditor.getEditorTitle
        ? NaviEditor.getEditorTitle()
        : 'Board';

    const svg =
      buildBoardExportSvg(title, board);

    const pngBlob =
      await convertSvgStringToPngBlob(svg);

    downloadBlobFile(
      `${safeFileName(title)}-board.png`,
      pngBlob
    );

    NaviEditor.setSaveStatus('Board PNG exported');
  } catch (error) {
    await showAppError(
      error?.message || String(error),
      'PNG export failed'
    );
  }
}

function exportBoardSvg() {
  const board =
    getBoardSnapshot();

  const title =
    NaviEditor.getEditorTitle
      ? NaviEditor.getEditorTitle()
      : 'Board';

  const svg =
    buildBoardExportSvg(title, board);

  downloadBoardFile(
    `${safeFileName(title)}-board.svg`,
    svg,
    'image/svg+xml'
  );
}

function getHostnameFromUrl(url) {
  try {
    return new URL(normalizeExternalUrl(url)).hostname;
  } catch {
    return '';
  }
}

function getBoardConnectorColor(connector) {
  const label =
    String(connector?.label || '').toLowerCase();

  if (
    label.includes('married') ||
    label.includes('spouse') ||
    label.includes('romance') ||
    label.includes('love')
  ) {
    return '#fb7185';
  }

  if (
    label.includes('parent') ||
    label.includes('child') ||
    label.includes('family') ||
    label.includes('mother') ||
    label.includes('father')
  ) {
    return '#22c55e';
  }

  if (
    label.includes('enemy') ||
    label.includes('rival') ||
    label.includes('betray') ||
    label.includes('conflict')
  ) {
    return '#ef4444';
  }

  if (
    label.includes('friend') ||
    label.includes('ally')
  ) {
    return '#38bdf8';
  }

  if (
    label.includes('mentor') ||
    label.includes('teacher')
  ) {
    return '#a78bfa';
  }

  return '#fb7185';
}

function buildBoardExportConnectorsSvg(board) {
  const itemMap = new Map();

  board.items.forEach(item => {
    itemMap.set(item.id, item);
  });

  const paths = board.connectors.map(connector => {
    const from = itemMap.get(connector.fromId);
    const to = itemMap.get(connector.toId);

    if (!from || !to) return '';

    const start = {
      x: Number(from.x || 0) + Number(from.width || 240) / 2,
      y: Number(from.y || 0) + Number(from.height || 140) / 2
    };

    const end = {
      x: Number(to.x || 0) + Number(to.width || 240) / 2,
      y: Number(to.y || 0) + Number(to.height || 140) / 2
    };

    const pathData = getConnectorPath(start, end, connector.type);
    const labelPosition = getConnectorLabelPosition(start, end);
    const stroke = getBoardConnectorColor(connector);

    return `
      <path
        d="${escapeSvgText(pathData)}"
        fill="none"
        stroke="${escapeSvgText(stroke)}"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      ${
        connector.label
          ? `
            <text
              class="board-connector-label"
              x="${labelPosition.x}"
              y="${labelPosition.y}"
              text-anchor="middle"
            >${escapeSvgText(connector.label)}</text>
          `
          : ''
      }
    `;
  }).join('\n');

  return `
    <svg
      class="export-board-connectors"
      xmlns="http://www.w3.org/2000/svg"
      width="5000"
      height="3500"
      viewBox="0 0 5000 3500"
    >
      ${paths}
    </svg>
  `;
}

function setupBoardPanning() {
  if (!els.boardSurface) return;

  let panning = false;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;

  els.boardSurface.addEventListener('pointerdown', event => {
    if (event.target.closest('.board-item')) return;

    panning = true;

    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = els.boardSurface.scrollLeft;
    startScrollTop = els.boardSurface.scrollTop;

    els.boardSurface.classList.add('panning');
    els.boardSurface.setPointerCapture(event.pointerId);
  });

  els.boardSurface.addEventListener('pointermove', event => {
    if (!panning) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    els.boardSurface.scrollLeft = startScrollLeft - dx;
    els.boardSurface.scrollTop = startScrollTop - dy;
  });

  els.boardSurface.addEventListener('pointerup', event => {
    if (!panning) return;

    panning = false;

    els.boardSurface.classList.remove('panning');

    try {
      els.boardSurface.releasePointerCapture(event.pointerId);
    } catch {}
  });

  els.boardSurface.addEventListener('pointercancel', () => {
    panning = false;
    els.boardSurface.classList.remove('panning');
  });

  els.boardSurface.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();

    if (event.deltaY < 0) {
      zoomBoardIn();
    } else {
      zoomBoardOut();
    }
  }, {
    passive: false
  });
  syncBoardModeBarState();
}



function updateBoardConnectorPositions() {
  const svg = document.getElementById('boardConnectorsLayer');

  if (!svg) return;

  svg.innerHTML = '';

  renderBoardConnectors(svg);
  renderBoardMinimap();
}


function wireBoardItemEvents(el, item) {
  const head = el.querySelector('.board-item-head');
  const deleteBtn = el.querySelector('.board-item-delete');
  const noteBody = el.querySelector('.board-note-body');
  const docLinkBtn = el.querySelector('.board-doc-link-btn');
  const resizeHandle = el.querySelector('.board-resize-handle');
  const editBtn = el.querySelector('.board-item-edit');

  function toggleOrSelectFromEvent(event) {
    selectBoardItem(item.id, Boolean(event.shiftKey));
  }

  el.addEventListener('pointerdown', event => {
    if (
      event.target.closest('.board-item-delete') ||
      event.target.closest('.board-note-body') ||
      event.target.closest('a') ||
      event.target.closest('button') ||
      event.target.closest('.board-resize-handle')
    ) {
      return;
    }

    if (boardConnectMode) {
      event.preventDefault();
      event.stopPropagation();
      handleBoardConnectionClick(item.id);
      return;
    }

    toggleOrSelectFromEvent(event);
  });

  if (noteBody) {
    noteBody.addEventListener('input', event => {
      item.text = event.currentTarget.innerText || '';
      scheduleAutosave();
    });

    noteBody.addEventListener('paste', event => {
      event.preventDefault();

      const text =
        event.clipboardData?.getData('text/plain') || '';

      document.execCommand('insertText', false, text);
    });
  }

  if (docLinkBtn) {
    docLinkBtn.onclick = event => {
      event.stopPropagation();

      const docId = docLinkBtn.dataset.docId;

      if (docId) {
        openDocument(docId);
      }
    };
  }

  if (deleteBtn) {
    deleteBtn.onclick = event => {
      event.stopPropagation();

      pushBoardUndoState();

      const idsToDelete =
        selectedBoardItemIds.has(item.id)
          ? Array.from(selectedBoardItemIds)
          : [item.id];

      currentBoardData.items =
        currentBoardData.items.filter(existing => {
          return !idsToDelete.includes(existing.id);
        });

      currentBoardData.connectors =
        currentBoardData.connectors.filter(connector => {
          return (
            !idsToDelete.includes(connector.fromId) &&
            !idsToDelete.includes(connector.toId)
          );
        });

      selectedBoardItemIds.clear();
      activeBoardItemId = null;

      renderBoard();
      scheduleAutosave();
    };
  }

  if (editBtn) {
    editBtn.onclick = event => {
      event.stopPropagation();

      if (item.type === 'person') {
        openBoardPersonModal(item);
        return;
      }

      if (item.type === 'link' && !item.docId) {
        openBoardLinkModal(item);
      }
    };
  }

  el.addEventListener('dblclick', event => {
    if (
      event.target.closest('.board-item-delete') ||
      event.target.closest('.board-resize-handle') ||
      event.target.closest('.board-note-body') ||
      event.target.closest('a') ||
      event.target.closest('button')
    ) {
      return;
    }

    if (item.type === 'person') {
      openBoardPersonModal(item);
      return;
    }

    if (item.type === 'link' && !item.docId) {
      openBoardLinkModal(item);
    }
  });

  if (resizeHandle) {
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();

      pushBoardUndoState();

      resizing = true;
      startX = event.clientX;
      startY = event.clientY;
      startWidth = item.width || el.offsetWidth;
      startHeight = item.height || el.offsetHeight;

      resizeHandle.setPointerCapture(event.pointerId);
    });

    resizeHandle.addEventListener('pointermove', event => {
      if (!resizing) return;

      const dx = (event.clientX - startX) / boardZoom;
      const dy = (event.clientY - startY) / boardZoom;

      item.width = Math.max(150, Math.round(startWidth + dx));
      item.height = Math.max(90, Math.round(startHeight + dy));

      el.style.width = `${item.width}px`;
      el.style.minHeight = `${item.height}px`;

      updateBoardConnectorPositions();
    });

    resizeHandle.addEventListener('pointerup', event => {
      if (!resizing) return;

      resizing = false;

      try {
        resizeHandle.releasePointerCapture(event.pointerId);
      } catch {}

      updateBoardConnectorPositions();
      scheduleAutosave();
    });

    resizeHandle.addEventListener('pointercancel', () => {
      resizing = false;
    });
  }

  if (!head) return;

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let draggedIds = [];
  let startPositions = new Map();

  head.addEventListener('pointerdown', event => {
    if (boardConnectMode) {
      event.preventDefault();
      event.stopPropagation();
      handleBoardConnectionClick(item.id);
      return;
    }

    if (event.target.closest('button')) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      selectBoardItem(item.id, true);
      return;
    }

    if (!selectedBoardItemIds.has(item.id)) {
      selectBoardItem(item.id, false);
    }

    pushBoardUndoState();

    dragging = true;
    startX = event.clientX;
    startY = event.clientY;

    draggedIds =
      selectedBoardItemIds.size
        ? Array.from(selectedBoardItemIds)
        : [item.id];

    startPositions = new Map();

    draggedIds.forEach(id => {
      const existing =
        currentBoardData.items.find(boardItem => {
          return boardItem.id === id;
        });

      if (existing) {
        startPositions.set(id, {
          x: Number(existing.x || 0),
          y: Number(existing.y || 0)
        });
      }
    });

    head.setPointerCapture(event.pointerId);
  });

  head.addEventListener('pointermove', event => {
    if (!dragging) return;

    const dx = (event.clientX - startX) / boardZoom;
    const dy = (event.clientY - startY) / boardZoom;

    draggedIds.forEach(id => {
      const existing =
        currentBoardData.items.find(boardItem => {
          return boardItem.id === id;
        });

      const start =
        startPositions.get(id);

      if (!existing || !start) return;

      existing.x = Math.max(0, start.x + dx);
      existing.y = Math.max(0, start.y + dy);

      const node =
        els.boardSurface?.querySelector(`.board-item[data-id="${CSS.escape(id)}"]`);

      if (node) {
        node.style.left = `${existing.x}px`;
        node.style.top = `${existing.y}px`;
      }
    });

    updateBoardConnectorPositions();
  });

  head.addEventListener('pointerup', event => {
    if (!dragging) return;

    dragging = false;

    try {
      head.releasePointerCapture(event.pointerId);
    } catch {}

    updateBoardConnectorPositions();
    scheduleAutosave();
  });

  head.addEventListener('pointercancel', () => {
    dragging = false;
  });
}

function setBoardZoom(nextZoom) {
  const previousZoom = boardZoom;

  boardZoom = Math.max(
    0.35,
    Math.min(2.5, Number(nextZoom) || 1)
  );

  if (!els.boardSurface) {
    renderBoard();
    return;
  }

  const centerX =
    els.boardSurface.scrollLeft +
    els.boardSurface.clientWidth / 2;

  const centerY =
    els.boardSurface.scrollTop +
    els.boardSurface.clientHeight / 2;

  const logicalCenterX = centerX / previousZoom;
  const logicalCenterY = centerY / previousZoom;

  renderBoard();

  els.boardSurface.scrollLeft =
    logicalCenterX * boardZoom -
    els.boardSurface.clientWidth / 2;

  els.boardSurface.scrollTop =
    logicalCenterY * boardZoom -
    els.boardSurface.clientHeight / 2;
}

function zoomBoardIn() {
  setBoardZoom(boardZoom + 0.1);
}

function zoomBoardOut() {
  setBoardZoom(boardZoom - 0.1);
}

function updateBoardZoomLabel() {
  if (!els.boardZoomLabel) return;

  els.boardZoomLabel.textContent =
    `${Math.round(boardZoom * 100)}%`;
}


function addBoardNote() {

  pushBoardUndoState();

const position = getBoardSpawnPosition();

  currentBoardData.items.push({
    id: crypto.randomUUID(),
    type: 'note',
    x: position.x,
y: position.y,
    width: 230,
    height: 150,
    text: 'New note...',
    color: '#fff8b5'
  });

  renderBoard();
  scheduleAutosave();
}

function openBoardPersonModal(existingItem = null) {
  if (!els.boardPersonModal) {
    addBoardPersonFallback();
    return;
  }

  editingBoardPersonId = existingItem?.id || null;

  if (els.boardPersonNameInput) {
    els.boardPersonNameInput.value =
      existingItem?.name || existingItem?.title || '';
    els.boardPersonNameInput.placeholder = 'New Person';
  }

  if (els.boardPersonRoleInput) {
    els.boardPersonRoleInput.value =
      existingItem?.role || '';
    els.boardPersonRoleInput.placeholder = 'Character';
  }

  if (els.boardPersonNotesInput) {
    els.boardPersonNotesInput.value =
      existingItem?.notes || '';
    els.boardPersonNotesInput.placeholder = 'Short notes...';
  }

  if (els.submitBoardPersonModalBtn) {
    els.submitBoardPersonModalBtn.textContent =
      editingBoardPersonId ? 'Save Person' : 'Add Person';
  }

  els.boardPersonModal.classList.remove('hidden');

  setTimeout(() => {
    els.boardPersonNameInput?.focus();
  }, 0);
}

function closeBoardPersonModal() {
  if (!els.boardPersonModal) return;

  els.boardPersonModal.classList.add('hidden');
  editingBoardPersonId = null;
}

function submitBoardPersonModal() {
  const name =
    els.boardPersonNameInput?.value.trim() || 'New Person';

  const role =
    els.boardPersonRoleInput?.value.trim() || 'Character';

  const notes =
    els.boardPersonNotesInput?.value.trim() || '';

  pushBoardUndoState();

  if (editingBoardPersonId) {
    const existing =
      currentBoardData.items.find(item => {
        return item.id === editingBoardPersonId;
      });

    if (existing) {
      existing.name = name;
      existing.title = name;
      existing.role = role;
      existing.notes = notes;
    }

    closeBoardPersonModal();
    renderBoard();
    scheduleAutosave();
    return;
  }

  const position =
    getBoardSpawnPosition();

  currentBoardData.items.push({
    id: crypto.randomUUID(),
    type: 'person',
    x: position.x,
    y: position.y,
    width: 240,
    height: 135,
    name,
    title: name,
    role,
    notes,
    color: '#fdf2f8'
  });

  closeBoardPersonModal();
  renderBoard();
  scheduleAutosave();
}

function addBoardPerson() {
  openBoardPersonModal();
}

/*
  Emergency fallback only if the modal is missing from HTML.
  Ideally this never runs.
*/
function addBoardPersonFallback() {
  const position = getBoardSpawnPosition();

  pushBoardUndoState();

  currentBoardData.items.push({
    id: crypto.randomUUID(),
    type: 'person',
    x: position.x,
    y: position.y,
    width: 240,
    height: 135,
    name: 'New Person',
    title: 'New Person',
    role: 'Character',
    notes: '',
    color: '#fdf2f8'
  });

  renderBoard();
  scheduleAutosave();
}

function getBoardSpawnPosition() {
  if (!els.boardSurface) {
    return {
      x: 80,
      y: 80
    };
  }

  return {
    x: els.boardSurface.scrollLeft + 80,
    y: els.boardSurface.scrollTop + 80
  };
}

async function addBoardImageFile(file) {

const position = getBoardSpawnPosition();

  if (!file) return;

  pushBoardUndoState();

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);

    reader.onload = () => resolve(reader.result);

    reader.readAsDataURL(file);
  });

  currentBoardData.items.push({
    id: crypto.randomUUID(),
    type: 'image',
    x: position.x,
y: position.y,
    width: 300,
    height: 220,
    src: dataUrl,
    title: file.name || 'Image',
    color: '#ffffff'
  });

  renderBoard();
  scheduleAutosave();
}

async function addBoardLink() {
  const choice = await openChoiceModal({
    title: 'Add Board Link',
    subtitle: 'Choose what kind of link to add.',
    options: [
      {
        value: 'external',
        icon: '🔗',
        title: 'External Link',
        desc: 'Link to a website or external resource.'
      },
      {
        value: 'doc',
        icon: '📄',
        title: 'Document Link',
        desc: 'Link to another NaviWriter document.'
      }
    ]
  });

  if (choice === 'doc') {
    await addBoardDocLink();
    return;
  }

  if (choice === 'external') {
    await addBoardExternalLink();
  }
}

async function addBoardExternalLink() {
  const result =
    await openBoardLinkModal();

  if (!result) return;

  pushBoardUndoState();

  const position =
    getBoardSpawnPosition();

  currentBoardData.items.push({
    id: crypto.randomUUID(),
    type: 'link',
    x: position.x,
    y: position.y,
    width: 280,
    height: 120,
    title: result.title,
    url: result.url,
    color: '#e0f2fe'
  });

  renderBoard();
  scheduleAutosave();
}

async function addBoardDocLink() {
  const docs =
    await NaviStorage.getAllDocuments();

  if (!docs.length) {
    showAppNotice(
      'No documents found to link.',
      'No documents'
    );
    return;
  }

  const choices =
    docs
      .slice(0, 60)
      .map(doc => ({
        value: doc.id,
        icon: '📄',
        title: doc.title || 'Untitled Document',
        desc: doc.docType || 'document'
      }));

  const pickedDocId =
    await openChoiceModal({
      title: 'Choose Linked Document',
      subtitle: 'Select a document to link from the board.',
      options: choices
    });

  if (!pickedDocId) return;

  const doc =
    docs.find(item => item.id === pickedDocId);

  if (!doc) return;

  pushBoardUndoState();

  const position =
    getBoardSpawnPosition();

  currentBoardData.items.push({
    id: crypto.randomUUID(),
    type: 'link',
    x: position.x,
    y: position.y,
    width: 280,
    height: 120,
    title: doc.title || 'Untitled Document',
    url: '',
    docId: doc.id,
    color: '#dcfce7'
  });

  renderBoard();
  scheduleAutosave();
}

async function openDocument(id) {
  const requestId = ++openDocumentRequestId;

  isLoadingDocument = true;
  window.NaviWriterIsLoadingDocument = true;
  clearTimeout(autosaveTimer);

  try {
    const doc = await NaviStorage.getDocument(id);

    if (requestId !== openDocumentRequestId) {
      return;
    }

    if (!doc) {
      console.warn('Document not found:', id);
      return;
    }

    currentDocumentId = doc.id;

    currentBoardData = normalizeBoardData(doc.board);
    activeBoardItemId = null;
    selectedBoardItemIds.clear();
    boardUndoStack = [];
    boardRedoStack = [];

    setBoardMode(false);
    applyDocumentTypePreset(doc);
    
    if (!isResearchDocument(doc)) {
  setSourcesMode(false);
}

    /*
      This must replace editor content, not append.
      Tiptap adapter now also clears ghost DOM.
    */
    NaviEditor.loadDocumentIntoEditor(doc);

    if (requestId !== openDocumentRequestId) {
      return;
    }

    const stats = NaviEditor.getEditorStats();
    sessionStartWords = stats.words;

    if (els.folderInput) {
      els.folderInput.value = doc.folder || '';
    }

    if (els.tagsInput) {
      els.tagsInput.value = Array.isArray(doc.tags)
        ? doc.tags.join(', ')
        : '';
    }

   if (els.docStatusSelect) {
  els.docStatusSelect.value =
    doc.status !== undefined && doc.status !== null
      ? doc.status
      : getDefaultStatusForDoc(doc);
}

if (els.docPovInput) {
  els.docPovInput.value = doc.pov || '';
}

if (els.docLocationInput) {
  els.docLocationInput.value = doc.location || '';
}

if (els.docTimelineInput) {
  els.docTimelineInput.value = doc.timeline || '';
}

if (els.docCharactersInput) {
  els.docCharactersInput.value = doc.characters || '';
}

if (els.docSummaryInput) {
  els.docSummaryInput.value = doc.summary || '';
}
    
    showOtherCustomMetadataFields = false;
    
    await renderCustomMetadataValues(doc);
    
    await loadDocumentGoal(doc.id);

    if (requestId !== openDocumentRequestId) {
      return;
    }

    updateInspector();
    await NaviStorage.saveSetting('lastDocumentId', currentDocumentId);

    renderDocumentList(documentsCache);
    
    await renderRelationshipPanel(doc.id);
    
    showResolvedInlineComments = false;
    
    await renderInlineCommentsPanel(doc);
    
    renderProjectCommentsPanel();
    
    
    if (document.body.classList.contains('sources-mode-active')) {
  await renderSourcesPanel();
}
    
    await restoreSplitForDocument(doc);
    
  } finally {
    setTimeout(() => {
      if (requestId === openDocumentRequestId) {
        isLoadingDocument = false;
        window.NaviWriterIsLoadingDocument = false;
      }
    }, 350);
  }
  
  requestAnimationFrame(() => {
  safelyRenderDocumentMap();
});
}

async function getCollections() {
  const saved =
    await NaviStorage.getSetting(COLLECTIONS_KEY, []);

  return Array.isArray(saved)
    ? saved.map(collection => ({
        id: collection.id || crypto.randomUUID(),
        name: collection.name || 'Untitled Collection',
        documentIds: Array.isArray(collection.documentIds)
          ? collection.documentIds
          : [],
        createdAt: collection.createdAt || Date.now(),
        updatedAt: collection.updatedAt || Date.now()
      }))
    : [];
}

async function saveCollections(collections) {
  await NaviStorage.saveSetting(
    COLLECTIONS_KEY,
    Array.isArray(collections) ? collections : []
  );
}

function getCollectionById(collections, id) {
  return collections.find(collection => {
    return collection.id === id;
  }) || null;
}

function getCollectionsForDocument(collections, docId) {
  if (!docId) return [];

  return collections.filter(collection => {
    return collection.documentIds.includes(docId);
  });
}

function getDocumentByIdFromCache(docId) {
  return documentsCache.find(doc => doc.id === docId) || null;
}

function getCollectionDocCountLabel(collection) {
  const count =
    collection?.documentIds?.length || 0;

  return `${count} ${count === 1 ? 'doc' : 'docs'}`;
}

async function handleNewDocument() {
  const doc = await NaviStorage.createDocument('Untitled Document');

  await loadDocuments();
  await openDocument(doc.id);

  NaviEditor.focusEditor();
}

async function createCollection() {
  const name =
    await openTextInputModal({
      title: 'New Collection',
      message: 'Name this document group.',
      label: 'Collection name',
      defaultValue: 'New Collection',
      placeholder: 'Act 1 Rewrite',
      submitText: 'Create Collection'
    });

  if (!name || !name.trim()) return;

  const collections =
    await getCollections();

  const collection = {
    id: crypto.randomUUID(),
    name: name.trim(),
    documentIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  collections.push(collection);

  activeCollectionId = collection.id;

 await saveCollections(collections);
collectionsCache = await getCollections();
await renderCollectionsModal();
renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Collection created');
}

async function renameActiveCollection() {
  const collections =
    await getCollections();

  const collection =
    getCollectionById(collections, activeCollectionId);

  if (!collection) {
    showAppNotice(
      'Choose a collection first.',
      'No collection selected'
    );
    return;
  }

  const name =
    await openTextInputModal({
      title: 'Rename Collection',
      message: 'Update this collection name.',
      label: 'Collection name',
      defaultValue: collection.name || 'Untitled Collection',
      placeholder: 'Act 1 Rewrite',
      submitText: 'Rename'
    });

  if (!name || !name.trim()) return;

  collection.name = name.trim();
  collection.updatedAt = Date.now();

  await saveCollections(collections);
collectionsCache = await getCollections();
await renderCollectionsModal();
renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Collection renamed');
}

async function deleteActiveCollection() {
  const collections =
    await getCollections();

  const collection =
    getCollectionById(collections, activeCollectionId);

  if (!collection) {
    showAppNotice(
      'Choose a collection first.',
      'No collection selected'
    );
    return;
  }

  const ok =
    await openConfirmModal({
      title: 'Delete Collection',
      message: `Delete "${collection.name || 'Untitled Collection'}"? Documents inside it will not be deleted.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

  if (!ok) return;

  const nextCollections =
    collections.filter(item => item.id !== collection.id);

  activeCollectionId =
    nextCollections[0]?.id || null;

  await saveCollections(nextCollections);
  collectionsCache = await getCollections();
  await renderCollectionsModal();
  renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Collection deleted');
}

async function addCurrentDocumentToCollection() {
  if (!currentDocumentId) {
    showAppNotice(
      'Open a document first.',
      'No document selected'
    );
    return;
  }

  const collections =
    await getCollections();

  if (!collections.length) {
    showAppNotice(
      'Create a collection first.',
      'No collections yet'
    );
    return;
  }

  let collection =
    getCollectionById(collections, activeCollectionId);

  if (!collection) {
    collection = collections[0];
    activeCollectionId = collection.id;
  }

 if (!collection.documentIds.includes(currentDocumentId)) {
  collection.documentIds.push(currentDocumentId);
  collection.updatedAt = Date.now();

  await saveCollections(collections);
  collectionsCache = await getCollections();
}

await renderCollectionsModal();
renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Document added to collection');
}

async function removeDocumentFromActiveCollection(docId) {
  const collections =
    await getCollections();

  const collection =
    getCollectionById(collections, activeCollectionId);

  if (!collection) return;

  collection.documentIds =
    collection.documentIds.filter(id => id !== docId);

  collection.updatedAt = Date.now();

 await saveCollections(collections);
collectionsCache = await getCollections();
await renderCollectionsModal();
renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Document removed from collection');
}

async function renderCollectionsModal() {
  if (
    !els.collectionsList ||
    !els.collectionDocsList
  ) {
    return;
  }

  const collections =
    await getCollections();

  if (
    activeCollectionId &&
    !collections.some(collection => collection.id === activeCollectionId)
  ) {
    activeCollectionId = null;
  }

  if (!activeCollectionId && collections.length) {
    activeCollectionId = collections[0].id;
  }

  renderCollectionsList(collections);
  renderCollectionDetail(collections);
}

function renderCollectionsList(collections) {
  if (!els.collectionsList) return;

  if (!collections.length) {
    els.collectionsList.innerHTML =
      '<div class="empty-note">No collections yet.</div>';
    return;
  }

  els.collectionsList.innerHTML = '';

  collections
    .slice()
    .sort((a, b) => {
      return String(a.name || '').localeCompare(String(b.name || ''));
    })
    .forEach(collection => {
      const button =
        document.createElement('button');

      button.type = 'button';

      button.className = [
        'collection-list-item',
        collection.id === activeCollectionId ? 'active' : ''
      ].filter(Boolean).join(' ');

      button.innerHTML = `
        <span class="collection-list-name">${escapeHtml(collection.name)}</span>
        <span class="collection-list-meta">${escapeHtml(getCollectionDocCountLabel(collection))}</span>
      `;

      button.onclick = () => {
        activeCollectionId = collection.id;
        renderCollectionsModal();
      };

      els.collectionsList.appendChild(button);
    });
}

function renderCollectionDetail(collections) {
  if (
    !els.collectionDetailTitle ||
    !els.collectionDetailMeta ||
    !els.collectionDocsList
  ) {
    return;
  }

  const collection =
    getCollectionById(collections, activeCollectionId);

  if (!collection) {
    els.collectionDetailTitle.textContent = 'Choose a collection';
    els.collectionDetailMeta.textContent =
      'Create or select a collection to view its documents.';
    els.collectionDocsList.innerHTML =
      '<div class="empty-note">No collection selected.</div>';
    return;
  }

  els.collectionDetailTitle.textContent =
    collection.name || 'Untitled Collection';

  els.collectionDetailMeta.textContent =
    getCollectionDocCountLabel(collection);

  const docIds =
    Array.isArray(collection.documentIds)
      ? collection.documentIds
      : [];

  if (!docIds.length) {
    els.collectionDocsList.innerHTML =
      '<div class="empty-note">No documents in this collection yet.</div>';
    return;
  }

  els.collectionDocsList.innerHTML = '';

  docIds.forEach(docId => {
    const doc =
      getDocumentByIdFromCache(docId);

    const row =
      document.createElement('div');

    row.className =
      doc
        ? 'collection-doc-row'
        : 'collection-doc-row missing';

    if (!doc) {
      row.innerHTML = `
  <div>
    <strong>Missing document</strong>
    <div class="collection-doc-meta">${escapeHtml(docId)}</div>
  </div>

  <button class="collection-remove-doc-btn" type="button">Remove</button>
`;
    } else {
      const status =
        typeof getDocStatusForDisplay === 'function'
          ? getDocStatusForDisplay(doc)
          : doc.status || '';

      const statusDot =
        typeof renderSidebarStatusDot === 'function'
          ? renderSidebarStatusDot(status)
          : '';

      row.innerHTML = `
  <div class="collection-doc-main">
    <strong>
      <span class="collection-doc-icon">${escapeHtml(getDocumentTypeIcon(doc))}</span>
      <span>${escapeHtml(doc.title || 'Untitled Document')}</span>
      ${statusDot}
    </strong>

    <div class="collection-doc-meta">
      ${escapeHtml(getReadableDocType(doc))} • ${Number(doc.wordCount || 0).toLocaleString()} words
      ${
        doc.folder
          ? ` • 📁 ${escapeHtml(doc.folder)}`
          : ''
      }
    </div>
  </div>

  <div class="collection-doc-actions">
    <button class="collection-open-doc-btn" type="button">Open</button>
    <button class="collection-remove-doc-btn" type="button">Remove</button>
  </div>
`;

      row.querySelector('.collection-open-doc-btn')?.addEventListener('click', async event => {
        event.stopPropagation();

        closeCollectionsModal();
        await openDocument(doc.id);
      });
    }

    row.querySelector('.collection-remove-doc-btn')?.addEventListener('click', async event => {
      event.stopPropagation();
      await removeDocumentFromActiveCollection(docId);
    });

    els.collectionDocsList.appendChild(row);
  });
}

async function openCollectionsModal() {
  if (!els.collectionsModal) return;

  els.collectionsModal.classList.remove('hidden');

  await renderCollectionsModal();
}

function closeCollectionsModal() {
  if (!els.collectionsModal) return;

  els.collectionsModal.classList.add('hidden');
}

async function handleRenameDocument() {
  if (!currentDocumentId) return;

  const current =
    await NaviStorage.getDocument(currentDocumentId);

  if (!current) return;

  const nextTitle =
    await openTextInputModal({
      title: 'Rename Document',
      message: 'Update this document title.',
      label: 'Document title',
      defaultValue: current.title || 'Untitled Document',
      placeholder: 'Untitled Document',
      submitText: 'Rename'
    });

  if (!nextTitle || !nextTitle.trim()) return;

  const renamed =
    await NaviStorage.renameDocument(
      currentDocumentId,
      nextTitle.trim()
    );

  await loadDocuments();
  await openDocument(renamed.id);
}

function formatSnapshotDate(timestamp) {
  if (!timestamp) return 'Unknown date';

  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

async function handleTakeSnapshot() {
  if (!currentDocumentId) {
    showAppNotice('Open a document first.');
    return;
  }

  await saveCurrentDocument({ manual: true });

  const current = await NaviStorage.getDocument(currentDocumentId);

  if (!current) {
    showAppNotice('Could not find the current document.');
    return;
  }

  const defaultName = `Snapshot - ${formatSnapshotDate(Date.now())}`;

  const name = prompt('Snapshot name:', defaultName);

  if (name === null) return;

  await NaviStorage.createSnapshot(
    current,
    name.trim() || defaultName
  );

  NaviEditor.setSaveStatus('Snapshot saved');
}

async function openSnapshotHistory() {
  if (!currentDocumentId) {
    showAppNotice('Open a document first.');
    return;
  }

  await saveCurrentDocument({ manual: true });

  if (els.snapshotModal) {
    els.snapshotModal.classList.remove('hidden');
  }

  await renderSnapshotList();
}

function openTextInputModal({
  title = 'Input',
  message = '',
  label = 'Value',
  defaultValue = '',
  placeholder = '',
  submitText = 'Continue'
} = {}) {
  if (
    !els.textInputModal ||
    !els.textInputModalField
  ) {
    return Promise.resolve(prompt(message || title, defaultValue));
  }

  if (els.textInputModalTitle) {
    els.textInputModalTitle.textContent = title;
  }

  if (els.textInputModalMessage) {
    els.textInputModalMessage.textContent = message;
  }

  if (els.textInputModalLabel) {
    els.textInputModalLabel.textContent = label;
  }

  if (els.submitTextInputModalBtn) {
    els.submitTextInputModalBtn.textContent = submitText;
  }

  els.textInputModalField.value = defaultValue || '';
  els.textInputModalField.placeholder = placeholder || '';

  els.textInputModal.classList.remove('hidden');

  setTimeout(() => {
    els.textInputModalField.focus();
    els.textInputModalField.select();
  }, 0);

  return new Promise(resolve => {
    pendingTextInputResolve = resolve;
  });
}

function resolveTextInputModal(value = null) {
  if (els.textInputModal) {
    els.textInputModal.classList.add('hidden');
  }

  const resolver = pendingTextInputResolve;

  pendingTextInputResolve = null;

  if (resolver) {
    resolver(value);
  }
}

function submitTextInputModal() {
  const value =
    els.textInputModalField?.value || '';

  resolveTextInputModal(value);
}

function closeTextInputModal() {
  resolveTextInputModal(null);
}

function openConfirmModal({
  title = 'Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
} = {}) {
  if (!els.confirmModal) {
    return Promise.resolve(confirm(message));
  }

  if (els.confirmModalTitle) {
    els.confirmModalTitle.textContent = title;
  }

  if (els.confirmModalMessage) {
    els.confirmModalMessage.textContent = message;
  }

  if (els.submitConfirmModalBtn) {
    els.submitConfirmModalBtn.textContent = confirmText;
    els.submitConfirmModalBtn.classList.toggle(
      'danger-confirm',
      Boolean(danger)
    );
  }

  if (els.cancelConfirmModalBtn) {
    els.cancelConfirmModalBtn.textContent = cancelText;
  }

  els.confirmModal.classList.remove('hidden');

  return new Promise(resolve => {
    pendingConfirmResolve = resolve;
  });
}

function resolveConfirmModal(value = false) {
  if (els.confirmModal) {
    els.confirmModal.classList.add('hidden');
  }

  const resolver = pendingConfirmResolve;

  pendingConfirmResolve = null;

  if (resolver) {
    resolver(Boolean(value));
  }
}

function closeConfirmModal() {
  resolveConfirmModal(false);
}

function closeSnapshotHistory() {
  if (!els.snapshotModal) return;

  els.snapshotModal.classList.add('hidden');
}

async function renderSnapshotList() {
  if (!els.snapshotList || !currentDocumentId) return;

  const snapshots =
    await NaviStorage.getDocumentSnapshots(currentDocumentId);

  if (!snapshots.length) {
    els.snapshotList.innerHTML =
      '<div class="empty-note">No snapshots yet.</div>';
    return;
  }

  els.snapshotList.innerHTML = '';

  snapshots.forEach(snapshot => {
    const row = document.createElement('div');
    row.className = 'snapshot-row';

    const words = Number(snapshot.wordCount || 0);

    row.innerHTML = `
      <div class="snapshot-row-main">
        <div class="snapshot-row-title">${escapeHtml(snapshot.name || 'Untitled Snapshot')}</div>
        <div class="snapshot-row-meta">
          ${escapeHtml(snapshot.title || 'Untitled Document')} •
          ${words} ${words === 1 ? 'word' : 'words'} •
          ${formatSnapshotDate(snapshot.createdAt)}
        </div>
      </div>

      <div class="snapshot-row-actions">
        <button class="restoreSnapshotBtn">Restore</button>
        <button class="deleteSnapshotBtn danger">Delete</button>
      </div>
    `;

    row.querySelector('.restoreSnapshotBtn').onclick = () => {
      restoreSnapshot(snapshot.id);
    };

    row.querySelector('.deleteSnapshotBtn').onclick = async () => {
      const ok = confirm(`Delete snapshot "${snapshot.name || 'Untitled Snapshot'}"?`);

      if (!ok) return;

      await NaviStorage.deleteSnapshot(snapshot.id);
      await renderSnapshotList();
      NaviEditor.setSaveStatus('Snapshot deleted');
    };

    els.snapshotList.appendChild(row);
  });
}

async function restoreSnapshot(snapshotId) {
  if (!currentDocumentId) return;

  const snapshot = await NaviStorage.getSnapshot(snapshotId);

  if (!snapshot) {
    showAppNotice('Snapshot not found.');
    return;
  }

  const ok = confirm(
    `Restore "${snapshot.name || 'Untitled Snapshot'}"?\n\n` +
    'This will replace the current document content. A safety snapshot will be created first.'
  );

  if (!ok) return;

  await saveCurrentDocument({ manual: true });

  const current = await NaviStorage.getDocument(currentDocumentId);

  if (!current) {
    showAppNotice('Current document not found.');
    return;
  }

  await NaviStorage.createSnapshot(
    current,
    `Before restore - ${formatSnapshotDate(Date.now())}`
  );

  const restored = {
    ...current,
    title: snapshot.title || current.title,
    content: snapshot.content || '<p></p>',
    plainText: snapshot.plainText || '',
    wordCount: snapshot.wordCount || 0,
    charCount: snapshot.charCount || 0,
    board: snapshot.board || null,
    docType: snapshot.docType || current.docType || 'standard',
    folder: snapshot.folder || current.folder || '',
    tags: Array.isArray(snapshot.tags) ? snapshot.tags : current.tags || []
  };

  const saved = await NaviStorage.saveDocument(restored);

  documentsCache = documentsCache.map(doc => {
    return doc.id === saved.id ? saved : doc;
  });

  closeSnapshotHistory();

  await loadDocuments();
  await openDocument(saved.id);

  NaviEditor.setSaveStatus('Snapshot restored');
}

async function handleDuplicateDocument() {
  if (!currentDocumentId) return;

  const duplicate = await NaviStorage.duplicateDocument(currentDocumentId);

  await loadDocuments();
  await openDocument(duplicate.id);
}

function getDescendantDocumentIds(rootId, documents) {
  const ids = [];
  const queue = [rootId];

  while (queue.length) {
    const currentId = queue.shift();

    const children = documents.filter(doc => {
      return doc.parentId === currentId;
    });

    children.forEach(child => {
      ids.push(child.id);
      queue.push(child.id);
    });
  }

  return ids;
}

function getDocumentTitleById(id, documents) {
  const doc = documents.find(item => item.id === id);

  return doc?.title || 'Untitled Document';
}

function getNextDocumentAfterDelete(deletedIds, documents) {
  return documents.find(doc => {
    return !deletedIds.includes(doc.id);
  }) || null;
}

async function deleteOrphanDocuments() {
  const docs = await NaviStorage.getAllDocuments();

  const ids = new Set(
    docs.map(doc => doc.id)
  );

  const orphans = docs.filter(doc => {
    return doc.parentId && !ids.has(doc.parentId);
  });

  if (!orphans.length) {
    showAppNotice('No orphan documents found.');
    return;
  }

  const ok = confirm(
    `Delete ${orphans.length} orphan document${orphans.length === 1 ? '' : 's'}?`
  );

  if (!ok) return;

  for (const doc of orphans) {
    await safelyDeleteSnapshotsForDocument(doc.id);
await NaviStorage.deleteDocument(doc.id);
  }

  await loadDocuments();

  if (currentDocumentId) {
    const currentStillExists =
      documentsCache.some(doc => doc.id === currentDocumentId);

    if (!currentStillExists && documentsCache.length) {
      await openDocument(documentsCache[0].id);
    }
  }

  renderDocumentList(documentsCache);
  NaviEditor.setSaveStatus('Orphans cleaned');
}

async function safelyDeleteSnapshotsForDocument(documentId) {
  if (!NaviStorage.deleteSnapshotsForDocument) {
    return;
  }

  try {
    await NaviStorage.deleteSnapshotsForDocument(documentId);
  } catch (error) {
    console.warn(
      'Could not delete snapshots for document. Continuing with document delete.',
      documentId,
      error
    );
  }
}

async function handleDeleteDocument() {
  if (!currentDocumentId) return;

  const allDocs = await NaviStorage.getAllDocuments();

  const current = allDocs.find(doc => {
    return doc.id === currentDocumentId;
  });

  if (!current) return;

  const descendantIds = getDescendantDocumentIds(
    currentDocumentId,
    allDocs
  );

  const idsToDelete = [
    currentDocumentId,
    ...descendantIds
  ];

  const childCount = descendantIds.length;

  const message =
    childCount > 0
      ? `Delete "${current.title || 'Untitled Document'}" and ${childCount} subdocument${childCount === 1 ? '' : 's'}?`
      : `Delete "${current.title || 'Untitled Document'}"?`;

  const ok = await openConfirmModal({
  title: 'Delete Document',
  message,
  confirmText: 'Delete',
  cancelText: 'Cancel',
  danger: true
});

if (!ok) return;

  clearTimeout(autosaveTimer);
  isLoadingDocument = true;

  try {
    for (const id of idsToDelete) {
      await safelyDeleteSnapshotsForDocument(id);
      await NaviStorage.deleteDocument(id);
    }

    currentDocumentId = null;

    await loadDocuments();

    const nextDoc = documentsCache.find(doc => {
      return !idsToDelete.includes(doc.id);
    }) || null;

    if (nextDoc) {
      await openDocument(nextDoc.id);
      return;
    }

    applyDocumentTypePreset(null);

    currentBoardData = normalizeBoardData(null);
    activeBoardItemId = null;
    selectedBoardItemIds.clear();
    boardUndoStack = [];
    boardRedoStack = [];

    NaviEditor.loadDocumentIntoEditor(null);
    NaviEditor.setSaveStatus('Ready');

    if (els.folderInput) {
      els.folderInput.value = '';
    }

    if (els.tagsInput) {
      els.tagsInput.value = '';
    }

    updateInspector();
    renderDocumentList(documentsCache);
  } catch (error) {
    console.error('Delete failed:', error);
    await showAppError(
  error?.message || String(error),
  'Delete Failed.'
);
    NaviEditor.setSaveStatus('Delete error');
  } finally {
    setTimeout(() => {
      isLoadingDocument = false;
    }, 350);
  }
}

async function saveCurrentDocument({ manual = false } = {}) {
  const documentIdAtSaveStart = currentDocumentId;

  if (!documentIdAtSaveStart) return;
  if (isLoadingDocument) return;
  if (window.NaviWriterIsLoadingDocument) return;
  if (isSaving) return;
  

  const editorSnapshot = NaviEditor.getEditorSnapshot();
  const boardSnapshot = getBoardSnapshot();

  isSaving = true;

  try {
    NaviEditor.setSaveStatus('Saving...');

    const current = await NaviStorage.getDocument(documentIdAtSaveStart);

    if (!current) {
      throw new Error('No current document found.');
    }

    if (currentDocumentId !== documentIdAtSaveStart) {
      return;
    }

    const updatedDoc = {
      ...current,
      ...editorSnapshot,
      board: boardSnapshot
    };

    const saved = await NaviStorage.saveDocument(updatedDoc);

    documentsCache = documentsCache.map(doc => {
      return doc.id === saved.id ? saved : doc;
    });

    documentsCache.sort((a, b) => {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    renderDocumentList(documentsCache);
    updateInspector();

    NaviEditor.setSaveStatus(manual ? 'Saved manually' : 'Saved');
  } catch (error) {
    console.error(error);
    NaviEditor.setSaveStatus('Save error');
  } finally {
    isSaving = false;
  }
}



function scheduleAutosave() {
  if (isLoadingDocument || window.NaviWriterIsLoadingDocument) {
    return;
  }

  if (!currentDocumentId) {
    return;
  }

  clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    saveCurrentDocument();
  }, AUTOSAVE_DELAY);
}

function extractSmartSearchFilters(query = '') {
  const filters = [];
  let freeText =
    String(query || '');

  const pattern =
    /\b(tag|status|type|folder|collection|pov|location|character|characters):("[^"]+"|\S+)/gi;

  freeText =
    freeText.replace(pattern, (match, key, rawValue) => {
      const value =
        String(rawValue || '')
          .replace(/^"|"$/g, '')
          .trim();

      filters.push({
        key: key.toLowerCase(),
        value: value.toLowerCase()
      });

      return ' ';
    });

  return {
    filters,
    freeText: freeText.trim().toLowerCase()
  };
}

function documentMatchesSmartFilter(doc, filter) {
  const value =
    filter.value;

  if (!value) return true;

  if (filter.key === 'tag') {
    return Array.isArray(doc.tags) &&
      doc.tags.some(tag => {
        return String(tag || '').toLowerCase().includes(value);
      });
  }

  if (filter.key === 'status') {
    const status =
      normalizeStatus(getDocStatusForDisplay(doc)).toLowerCase();

    if (value === 'none') {
      return !status;
    }

    return status.includes(value);
  }

  if (filter.key === 'type') {
    return String(doc.docType || 'general')
      .toLowerCase()
      .includes(value);
  }

  if (filter.key === 'folder') {
    return getDocumentFolderName(doc)
      .toLowerCase()
      .includes(value);
  }

  if (filter.key === 'collection') {
    const collections =
      getCollectionsForDocument(collectionsCache, doc.id);

    return collections.some(collection => {
      return String(collection.name || '')
        .toLowerCase()
        .includes(value);
    });
  }

  if (filter.key === 'pov') {
    return String(doc.pov || '')
      .toLowerCase()
      .includes(value);
  }

  if (filter.key === 'location') {
    return String(doc.location || '')
      .toLowerCase()
      .includes(value);
  }

  if (
    filter.key === 'character' ||
    filter.key === 'characters'
  ) {
    return String(doc.characters || '')
      .toLowerCase()
      .includes(value);
  }

  return true;
}

function documentMatchesFreeSearch(doc, freeText = '') {
  if (!freeText) return true;

  const haystack = [
    doc.title,
    doc.docType,
    doc.folder,
    doc.status,
    doc.pov,
    doc.location,
    doc.timeline,
    doc.characters,
    doc.summary,
    doc.plainText,
    Array.isArray(doc.tags) ? doc.tags.join(', ') : '',
    getCollectionsForDocument(collectionsCache, doc.id)
      .map(collection => collection.name)
      .join(', ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(freeText);
}

function filterDocumentsBySmartSearch(documents = [], query = '') {
  const { filters, freeText } =
    extractSmartSearchFilters(query);

  return documents.filter(doc => {
    const passesFilters =
      filters.every(filter => {
        return documentMatchesSmartFilter(doc, filter);
      });

    if (!passesFilters) return false;

    return documentMatchesFreeSearch(doc, freeText);
  });
}

async function handleSearch() {
  const query =
    els.docSearch?.value || '';

  collectionsCache =
    await getCollections();

  const results =
    query.trim()
      ? filterDocumentsBySmartSearch(documentsCache, query)
      : documentsCache;

  renderDocumentList(results);
}

async function openInitialDocument() {
  await loadDocuments();

  const lastId = await NaviStorage.getSetting('lastDocumentId', null);

  if (lastId) {
    const lastDoc = await NaviStorage.getDocument(lastId);

    if (lastDoc) {
      await openDocument(lastId);
      return;
    }
  }

  if (documentsCache.length) {
    await openDocument(documentsCache[0].id);
    return;
  }

  await handleNewDocument();
}

function cleanupChapterText(text) {
  let result = String(text || '');

  // Remove repeated running title/header.
  result = result.replace(
    /JOY:\s*TIS\s*BUT\s*A\s*PRIVILEGE/gi,
    ''
  );

  // Remove standalone page numbers.
  result = result.replace(
    /^\s*\d{1,4}\s*$/gm,
    ''
  );

  // Remove page numbers that appear before blank breaks.
  result = result.replace(
    /\s+\d{1,4}\s*\n\s*\n/g,
    '\n\n'
  );

  // Remove page numbers wedged between continuing sentence fragments.
  result = result.replace(
    /([a-z,”"’])\s+\d{1,4}\s+([a-z“"‘])/g,
    '$1 $2'
  );

  // Repair common PDF extraction oddities.
  result = result.replace(/\bA nd\b/g, 'And');
  result = result.replace(/\bT he\b/g, 'The');
  result = result.replace(/\bI t\b/g, 'It');
  result = result.replace(/\bS he\b/g, 'She');
  result = result.replace(/\bH e\b/g, 'He');
  result = result.replace(/\bW e\b/g, 'We');

  // Remove huge repeated whitespace.
  result = result.replace(/[ \t]{2,}/g, ' ');

  // Normalize too many blank lines.
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

function repairChapterOpeningDropCap(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    return String(text || '');
  }

  const titleIndex = paragraphs.findIndex(paragraph =>
    /^Chapter\s+\d+\s*:/i.test(paragraph)
  );

  const bodyIndex =
    titleIndex >= 0
      ? titleIndex + 1
      : 0;

  if (!paragraphs[bodyIndex]) {
    return paragraphs.join('\n\n');
  }

  let firstBodyParagraph = paragraphs[bodyIndex];

  // Fix obvious missing opening letters.
  firstBodyParagraph = inferMissingOpeningLetter(firstBodyParagraph);

  // Fix missing spaces like "Ilooked", "Asky", etc.
  firstBodyParagraph = repairOneLetterWordSpacing(firstBodyParagraph);

  paragraphs[bodyIndex] = firstBodyParagraph;

  return paragraphs.join('\n\n');
}

function inferMissingOpeningLetter(paragraph) {
  const text = String(paragraph || '').trim();
  const lower = text.toLowerCase();

  if (!text) return text;

  // Already starts normally.
  if (/^[A-Z0-9“"‘]/.test(text)) {
    return text;
  }

  // Known broken drop-cap openings.
  if (lower.startsWith('nd ')) {
    return 'A' + text;
  }

  if (lower.startsWith('he ')) {
    return 'T' + text;
  }

  // First-person narration openings.
  const firstPersonVerbs = [
    'sat ',
    'stood ',
    'looked ',
    'wanted ',
    'felt ',
    'was ',
    'had ',
    'could ',
    'took ',
    'opened ',
    'closed ',
    'tried ',
    'hugged ',
    'walked ',
    'stared ',
    'watched ',
    'remembered ',
    'thought ',
    'heard ',
    'saw ',
    'knew ',
    'frowned ',
    'smiled ',
    'sighed ',
    'held ',
    'ran ',
    'rushed ',
    'cried ',
    'asked '
  ];

  if (firstPersonVerbs.some(prefix => lower.startsWith(prefix))) {
    return 'I ' + text;
  }

  return text;
}

function repairOneLetterWordSpacing(text) {
  let result = String(text || '');

  // Ilooked -> I looked
  result = result.replace(
    /\bI(?=(looked|wanted|sat|stood|felt|was|had|could|took|opened|closed|tried|hugged|walked|stared|watched|remembered|thought|heard|saw|knew|frowned|smiled|sighed|held|ran|rushed|cried|asked)\b)/gi,
    'I '
  );

  // Achoir -> A choir
  result = result.replace(
    /\bA(?=(choir|voice|man|woman|child|tree|family|nation|sound|few|little|large|small|person|place|moment|day|night|room|house|bench|letter|storm|sky|road|grave|coffin|flower)\b)/gi,
    'A '
  );

  return result;
}

function repairFirstWordWithDropCap(letter, paragraph) {
  const cleanLetter = String(letter || '').trim();
  const cleanParagraph = String(paragraph || '').trim();

  if (!cleanLetter || !cleanParagraph) {
    return cleanParagraph;
  }

  const combined = cleanLetter + cleanParagraph;

  /**
   * One-letter word case:
   *
   * "I" + "looked away..." should become:
   * "I looked away..."
   *
   * "A" + "choir sang..." should become:
   * "A choir sang..."
   *
   * Without this, we get:
   * "Ilooked..."
   * "Achoir..."
   */
  if (
    cleanLetter === 'I' ||
    cleanLetter === 'A'
  ) {
    return cleanLetter + ' ' + cleanParagraph;
  }

  /**
   * Normal word case:
   *
   * "A" + "nd the choir..." should become:
   * "And the choir..."
   *
   * "T" + "he trees..." should become:
   * "The trees..."
   */
  return combined;
}

async function handleExportDocument(format = 'navidoc') {
  if (!currentDocumentId) return;

  await saveCurrentDocument({ manual: true });

  const doc = await NaviStorage.getDocument(currentDocumentId);

  const isManuscriptExport =
  doc.docType === 'manuscript';

if (isManuscriptExport && window.NaviExport?.exportManuscriptHtml && format === 'html') {
  const orderedDocs = await getOrderedManuscriptDocs(doc);
  NaviExport.exportManuscriptHtml(doc, orderedDocs);
  return;
}

if (isManuscriptExport && window.NaviExport?.exportManuscriptTxt && format === 'txt') {
  const orderedDocs = await getOrderedManuscriptDocs(doc);
  NaviExport.exportManuscriptTxt(doc, orderedDocs);
  return;
}

if (isManuscriptExport && window.NaviExport?.exportManuscriptMarkdown && format === 'markdown') {
  const orderedDocs = await getOrderedManuscriptDocs(doc);
  NaviExport.exportManuscriptMarkdown(doc, orderedDocs);
  return;
}

  if (!doc) return;

  if (!window.NaviExport) {
    showAppNotice('Export tools are not loaded.');
    return;
  }

  if (format === 'html') {
    NaviExport.exportHtml(doc);
    return;
  }

  if (format === 'txt') {
    NaviExport.exportTxt(doc);
    return;
  }
  
  if (format === 'docx') {
  NaviExport.exportDocx(doc);
  return;
}

  if (format === 'markdown') {
    NaviExport.exportMarkdown(doc);
    return;
  }

  if (format === 'print') {
    NaviExport.printDocument();
    return;
  }

  NaviExport.exportNaviDoc(doc);
}



function handleImportClick() {
  if (els.importFile) {
    els.importFile.click();
  }
}

async function handleImportFile(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (/\.docx$/i.test(file.name)) {
  try {
    NaviEditor.setSaveStatus('Importing DOCX...');
    await importDocxFile(file);
    NaviEditor.setSaveStatus('DOCX imported');
  } catch (error) {
    console.error('DOCX import failed:', error);
    await showAppError(
  error?.message || String(error),
  'DOCX import failed.'
);
    NaviEditor.setSaveStatus('DOCX import error');
  } finally {
    event.target.value = '';
  }

  return;
}

  try {
    const text = await file.text();

    let imported;

    if (window.NaviExport?.parseImportedDocument) {
      imported = NaviExport.parseImportedDocument(text, file.name);
    } else {
      imported = JSON.parse(text);
    }

    const now = Date.now();

    const baseDoc = NaviStorage.createBlankDocument(
      imported.title || file.name.replace(/\.[^.]+$/, '') || 'Imported Document'
    );

    const doc = {
      ...baseDoc,
      ...imported,
      id: crypto.randomUUID ? crypto.randomUUID() : `doc-${now}`,
      createdAt: now,
      updatedAt: now
    };

    const saved = await NaviStorage.saveDocument(doc);

    await loadDocuments();
    await openDocument(saved.id);
  } catch (error) {
    console.error(error);
    showAppNotice('Import failed. This file may not be a valid NaviDoc.');
  } finally {
    event.target.value = '';
  }
}

function setFocusMode(enabled) {
  const isFocus = Boolean(enabled);

  document.body.classList.toggle('focus-mode', isFocus);

  try {
    localStorage.setItem('naviwriter-focus-mode', isFocus ? 'true' : 'false');
  } catch {}

  if (els.focusBtn) {
    els.focusBtn.classList.toggle('active', isFocus);
    els.focusBtn.textContent = isFocus ? 'Focused' : 'Focus';
  }

  return isFocus;
}

function exitFocusMode() {
  setFocusMode(false);
}

async function loadDocumentGoal(id) {
  if (!id) {
    currentGoal = 0;
    return;
  }

  currentGoal = Number(await NaviStorage.getSetting(`goal:${id}`, 0)) || 0;

  if (els.goalInput) {
    els.goalInput.value = currentGoal || '';
  }
}

async function saveDocumentGoal() {
  if (!currentDocumentId) return;

  const goal = Number(els.goalInput?.value || 0);

  currentGoal = Math.max(0, goal);

  await NaviStorage.saveSetting(`goal:${currentDocumentId}`, currentGoal);

  updateInspector();
}

function updateInspector() {
  if (!window.NaviEditor) return;

  const stats = NaviEditor.getEditorStats();
  const sessionWords = Math.max(0, stats.words - sessionStartWords);

  if (els.statWords) els.statWords.textContent = stats.words;
  if (els.statChars) els.statChars.textContent = stats.chars;
  if (els.statParagraphs) els.statParagraphs.textContent = stats.paragraphs;
  if (els.statHeadings) els.statHeadings.textContent = stats.headings;
  if (els.statReadingTime) els.statReadingTime.textContent = `${stats.readingMinutes} min`;
  if (els.statSessionWords) els.statSessionWords.textContent = `+${sessionWords}`;

  updateGoalDisplay(stats.words);
  renderOutline();
  renderRecentDocuments();
  updateRepeatedTextAnalysis();
  renderHeadingCounts();
  updateLongGoalDisplay();
  updateDailyGoalDisplay();
}

async function updateRepeatedTextAnalysis() {
  if (!els.topWordsList || !els.topPhrasesList) return;

  const text = await getAnalysisText();

  renderAnalysisList(
    els.topWordsList,
    getFrequentWordsFromText(text, 10)
  );

  renderAnalysisList(
    els.topPhrasesList,
    getFrequentPhrasesFromText(text, 3, 10)
  );
}

function updateGoalDisplay(words) {
  if (!els.goalProgress || !els.goalBarFill) return;

  if (!currentGoal) {
    els.goalProgress.textContent = 'No goal set.';
    els.goalBarFill.style.width = '0%';
    return;
  }

  const percent = Math.min(100, Math.round(words / currentGoal * 100));

  els.goalProgress.textContent = `${words}/${currentGoal} words • ${percent}%`;
  els.goalBarFill.style.width = `${percent}%`;
}

function renderOutline() {
  if (!els.outlineList) return;

  const outline = NaviEditor.buildOutline();

  if (!outline.length) {
    els.outlineList.innerHTML = '<div class="empty-note">No headings yet.</div>';
    return;
  }

  els.outlineList.innerHTML = '';

  outline.forEach(item => {
    const button = document.createElement('button');

    button.className = `outline-item level-${item.level}`;
    button.textContent = item.text;

    button.onclick = () => {
      NaviEditor.scrollToHeading(item.id);
    };

    els.outlineList.appendChild(button);
  });
}

function renderRecentDocuments() {
  if (!els.recentDocsList) return;

  const recent = documentsCache
    .filter(doc => doc.id !== currentDocumentId)
    .slice(0, 5);

  if (!recent.length) {
    els.recentDocsList.innerHTML = '<div class="empty-note">No other recent documents.</div>';
    return;
  }

  els.recentDocsList.innerHTML = '';

  recent.forEach(doc => {
    const card = document.createElement('button');

    card.className = 'recent-doc-item';

    card.innerHTML = `
      <div>${escapeHtml(doc.title || 'Untitled Document')}</div>
      <div class="recent-doc-meta">${Number(doc.wordCount || 0)} words • ${formatDate(doc.updatedAt)}</div>
    `;

    card.onclick = () => {
      openDocument(doc.id);
    };

    els.recentDocsList.appendChild(card);
  });
}

function getDefaultCustomMetadataValueForType(type = 'text') {
  if (type === 'checkbox') {
    return false;
  }

  return '';
}

function normalizeCustomMetadataValue(field, value) {
  const type =
    normalizeCustomMetadataFieldType(field?.type || 'text');

  if (type === 'checkbox') {
    return Boolean(value);
  }

  if (type === 'number') {
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : '';
  }

  if (type === 'dropdown') {
    const cleanValue =
      String(value || '');

    const options =
      Array.isArray(field.options)
        ? field.options
        : [];

    return options.includes(cleanValue)
      ? cleanValue
      : '';
  }

  if (type === 'date') {
    return String(value || '').slice(0, 10);
  }

  return String(value || '');
}

function customMetadataValueHasContent(field, value) {
  if (!field) {
    return false;
  }

  const cleanValue =
    normalizeCustomMetadataValue(
      field,
      value
    );

  if (field.type === 'checkbox') {
    return cleanValue === true;
  }

  return !(
    cleanValue === '' ||
    cleanValue === null ||
    cleanValue === undefined
  );
}

function splitCustomMetadataFieldsForSidebar(fields = [], values = {}) {
  const relevantFields = [];
  const otherFields = [];

  fields.forEach(field => {
    const hasValue =
      customMetadataValueHasContent(
        field,
        values[field.id]
      );

    if (hasValue) {
      relevantFields.push(field);
    } else {
      otherFields.push(field);
    }
  });

  return {
    relevantFields,
    otherFields
  };
}

function getDocumentCustomMetadata(doc) {
  if (
    doc &&
    doc.customMetadata &&
    typeof doc.customMetadata === 'object' &&
    !Array.isArray(doc.customMetadata)
  ) {
    return {
      ...doc.customMetadata
    };
  }

  return {};
}

function renderCustomMetadataValueControl(field, currentValue) {
  if (field.type === 'longText') {
    return `
      <textarea
        class="custom-metadata-value-input"
        data-custom-metadata-value-field="${escapeHtml(field.id)}"
        rows="3"
        placeholder="${escapeHtml(field.name)}"
      >${escapeHtml(currentValue)}</textarea>
    `;
  }

  if (field.type === 'dropdown') {
    const optionsHtml =
      (field.options || [])
        .map(option => {
          return `
            <option
              value="${escapeHtml(option)}"
              ${option === currentValue ? 'selected' : ''}
            >
              ${escapeHtml(option)}
            </option>
          `;
        })
        .join('');

    return `
      <select
        class="custom-metadata-value-input"
        data-custom-metadata-value-field="${escapeHtml(field.id)}"
      >
        <option value="">—</option>
        ${optionsHtml}
      </select>
    `;
  }

  if (field.type === 'checkbox') {
    return `
      <input
        type="checkbox"
        class="custom-metadata-value-input"
        data-custom-metadata-value-field="${escapeHtml(field.id)}"
        ${currentValue ? 'checked' : ''}
      />
    `;
  }

  if (field.type === 'number') {
    return `
      <input
        type="number"
        class="custom-metadata-value-input"
        data-custom-metadata-value-field="${escapeHtml(field.id)}"
        value="${escapeHtml(currentValue)}"
        placeholder="0"
      />
    `;
  }

  if (field.type === 'date') {
    return `
      <input
        type="date"
        class="custom-metadata-value-input"
        data-custom-metadata-value-field="${escapeHtml(field.id)}"
        value="${escapeHtml(currentValue)}"
      />
    `;
  }

  return `
    <input
      type="text"
      class="custom-metadata-value-input"
      data-custom-metadata-value-field="${escapeHtml(field.id)}"
      value="${escapeHtml(currentValue)}"
      placeholder="${escapeHtml(field.name)}"
    />
  `;
}

function createCustomMetadataValueRow(field, values = {}) {
  const row =
    document.createElement('label');

  row.className =
    `custom-metadata-value-row field-type-${field.type}`;

  row.dataset.customMetadataFieldId =
    field.id;

  const currentValue =
    values[field.id] !== undefined
      ? normalizeCustomMetadataValue(
          field,
          values[field.id]
        )
      : getDefaultCustomMetadataValueForType(field.type);

  row.innerHTML = `
    <span class="custom-metadata-value-label">
      <strong>${escapeHtml(field.name)}</strong>
      <small>${escapeHtml(getCustomMetadataFieldTypeLabel(field.type))}</small>
    </span>

    <span class="custom-metadata-value-control">
      ${renderCustomMetadataValueControl(field, currentValue)}
    </span>
  `;

  return row;
}

async function renderCustomMetadataValues(doc = null) {
  if (!els.customMetadataValuesList) {
    return;
  }

  const fields =
    await getCustomMetadataFields();

  if (!fields.length) {
    els.customMetadataValuesList.innerHTML =
      '<div class="empty-note">No custom fields yet. Create one with Fields.</div>';
    return;
  }

  const currentDoc =
    doc ||
    (
      currentDocumentId
        ? await NaviStorage.getDocument(currentDocumentId)
        : null
    );

  const values =
    getDocumentCustomMetadata(currentDoc);

  const {
    relevantFields,
    otherFields
  } =
    splitCustomMetadataFieldsForSidebar(
      fields,
      values
    );

  els.customMetadataValuesList.innerHTML = '';

  const relevantWrap =
    document.createElement('div');

  relevantWrap.className =
    'custom-metadata-relevant-fields';

  if (relevantFields.length) {
    relevantFields.forEach(field => {
      relevantWrap.appendChild(
        createCustomMetadataValueRow(
          field,
          values
        )
      );
    });
  } else {
    relevantWrap.innerHTML =
      '<div class="empty-note">No filled custom fields for this document yet.</div>';
  }

  els.customMetadataValuesList.appendChild(
    relevantWrap
  );

  if (otherFields.length) {
    const otherWrap =
      document.createElement('div');

    otherWrap.className =
      'custom-metadata-other-fields';

    const toggle =
      document.createElement('button');

    toggle.type =
      'button';

    toggle.className =
      'custom-metadata-other-toggle';

    toggle.innerHTML = `
      <span>
        ${showOtherCustomMetadataFields ? '▾' : '▸'}
        Other Fields
      </span>

      <small>
        ${otherFields.length}
      </small>
    `;

    toggle.addEventListener('click', () => {
      showOtherCustomMetadataFields =
        !showOtherCustomMetadataFields;

      renderCustomMetadataValues(
        currentDoc
      );
    });

    otherWrap.appendChild(toggle);

    if (showOtherCustomMetadataFields) {
      const otherList =
        document.createElement('div');

      otherList.className =
        'custom-metadata-other-list';

      otherFields.forEach(field => {
        otherList.appendChild(
          createCustomMetadataValueRow(
            field,
            values
          )
        );
      });

      otherWrap.appendChild(otherList);
    }

    els.customMetadataValuesList.appendChild(
      otherWrap
    );
  }

  wireCustomMetadataValueInputs();
}

function wireCustomMetadataValueInputs() {
  if (!els.customMetadataValuesList) {
    return;
  }

  els.customMetadataValuesList
    .querySelectorAll('[data-custom-metadata-value-field]')
    .forEach(input => {
      const eventName =
        input.type === 'checkbox'
          ? 'change'
          : 'input';

      input.addEventListener(
        eventName,
        scheduleCustomMetadataValueSave
      );

      /*
        Dropdowns should save immediately on change.
      */
      if (input.tagName === 'SELECT') {
        input.addEventListener(
          'change',
          scheduleCustomMetadataValueSave
        );
      }
    });
}

let customMetadataSaveTimer = null;

function scheduleCustomMetadataValueSave() {
  clearTimeout(customMetadataSaveTimer);

  customMetadataSaveTimer =
    setTimeout(() => {
      saveCurrentCustomMetadataValues();
    }, 350);
}

async function saveCurrentCustomMetadataValues() {
  if (!currentDocumentId || !els.customMetadataValuesList) {
    return;
  }

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) {
    return;
  }

  const fields =
    await getCustomMetadataFields();

  const fieldMap =
    new Map(
      fields.map(field => {
        return [field.id, field];
      })
    );

  const nextValues =
    getDocumentCustomMetadata(doc);

  els.customMetadataValuesList
    .querySelectorAll('[data-custom-metadata-value-field]')
    .forEach(input => {
      const fieldId =
        input.dataset.customMetadataValueField;

      const field =
        fieldMap.get(fieldId);

      if (!field) {
        return;
      }

      let rawValue = '';

      if (input.type === 'checkbox') {
        rawValue =
          input.checked;
      } else {
        rawValue =
          input.value;
      }

      const cleanValue =
        normalizeCustomMetadataValue(
          field,
          rawValue
        );

      const shouldRemove =
        cleanValue === '' ||
        cleanValue === null ||
        cleanValue === undefined ||
        (
          field.type === 'checkbox' &&
          cleanValue === false
        );

      if (shouldRemove) {
        delete nextValues[fieldId];
      } else {
        nextValues[fieldId] =
          cleanValue;
      }
    });

  const saved =
    await NaviStorage.saveDocument({
      ...doc,
      customMetadata:
        nextValues,
      updatedAt:
        Date.now()
    });

  documentsCache =
    documentsCache.map(item => {
      return item.id === saved.id
        ? saved
        : item;
    });

  renderDocumentList(documentsCache);

  NaviEditor.setSaveStatus('Custom metadata saved');
  
  await renderCustomMetadataValues(saved);
  
}

async function saveCurrentMetadata() {
  if (!currentDocumentId) return;

  const current =
    await NaviStorage.getDocument(currentDocumentId);

  if (!current) return;

  const updated = {
    ...current,

    folder:
      els.folderInput?.value.trim() || '',

    tags:
      parseTags(els.tagsInput?.value || ''),

    status:
  els.docStatusSelect?.value || '',

    pov:
      els.docPovInput?.value.trim() || '',

    location:
      els.docLocationInput?.value.trim() || '',

    timeline:
      els.docTimelineInput?.value.trim() || '',

    characters:
      els.docCharactersInput?.value.trim() || '',

    summary:
      els.docSummaryInput?.value.trim() || '',

    updatedAt:
      Date.now()
  };

  const saved =
    await NaviStorage.saveDocument(updated);

  documentsCache =
    documentsCache.map(doc => {
      return doc.id === saved.id
        ? saved
        : doc;
    });

  renderDocumentList(documentsCache);
  updateInspector();

  NaviEditor.setSaveStatus('Details saved');
}

function renderAnalysisList(container, items) {
  if (!container) return;

  if (!items.length) {
    container.innerHTML =
      '<div class="empty-note">Nothing found yet.</div>';
    return;
  }

  container.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('button');

    row.className = 'analysis-item';

    row.innerHTML = `
      <strong>${escapeHtml(item.text)}</strong>
      <span>${item.count}</span>
    `;

    row.onclick = () => {
      openFindPanel(item.text);
    };

    container.appendChild(row);
  });
}

function renderHeadingCounts() {
  if (!els.headingCountsList) return;

  const sections = NaviEditor.getHeadingWordCounts();

  if (!sections.length) {
    els.headingCountsList.innerHTML = '<div class="empty-note">No headings yet.</div>';
    return;
  }

  els.headingCountsList.innerHTML = '';

  sections.forEach(section => {
    const row = document.createElement('button');
    row.className = `outline-item level-${section.level}`;

    row.innerHTML = `
      <span>${escapeHtml(section.title)}</span>
      <span>${section.words} words</span>
    `;

    row.onclick = () => {
      NaviEditor.scrollToHeading(section.id);
    };

    els.headingCountsList.appendChild(row);
  });
}

async function loadLongGoal() {
  const goal = await NaviStorage.getSetting('longGoal', null);

  if (!goal) return;

  if (els.longGoalWordsInput) {
    els.longGoalWordsInput.value = goal.words || '';
  }

  if (els.longGoalDateInput) {
    els.longGoalDateInput.value = goal.date || '';
  }

  updateLongGoalDisplay();
}

async function saveLongGoal() {
  const words = Number(els.longGoalWordsInput?.value || 0);
  const date = els.longGoalDateInput?.value || '';

  await NaviStorage.saveSetting('longGoal', {
    words,
    date
  });

  updateLongGoalDisplay();
}

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function getProjectRootDocumentId(docId) {
  if (!docId) return null;

  let current = await NaviStorage.getDocument(docId);

  if (!current) return null;

  while (current.parentId) {
    const parent = await NaviStorage.getDocument(current.parentId);

    if (!parent) break;

    current = parent;
  }

  return current.id;
}

async function getProjectDocuments(rootId) {
  const allDocs = await NaviStorage.getAllDocuments();

  const result = [];
  const queue = [rootId];

  while (queue.length) {
    const currentId = queue.shift();

    const doc = allDocs.find(item => item.id === currentId);

    if (doc) {
      result.push(doc);
    }

    const children = allDocs.filter(item => item.parentId === currentId);

    children.forEach(child => {
      queue.push(child.id);
    });
  }

  return result;
}

function getOrCreateFindLocationIndicator() {
  let indicator = document.getElementById('findLocationIndicator');

  if (indicator) {
    return indicator;
  }

  indicator = document.createElement('div');
  indicator.id = 'findLocationIndicator';
  indicator.className = 'find-location-indicator';

  indicator.innerHTML = `
    <div class="find-location-arrow"></div>
    <div class="find-location-pill" id="findLocationPill">Match</div>
  `;

  document.body.appendChild(indicator);

  return indicator;
}

function showFindLocationIndicator(targetElement, label = 'Match') {
  if (!targetElement) return;

  const indicator = getOrCreateFindLocationIndicator();
  const pill = document.getElementById('findLocationPill');

  if (pill) {
    pill.textContent = label;
  }

  const targetRect = targetElement.getBoundingClientRect();

  const editorPage =
    document.querySelector('.editor-page') ||
    document.getElementById('editor');

  const pageRect =
    editorPage?.getBoundingClientRect();

  const top = Math.max(
    72,
    Math.min(
      window.innerHeight - 48,
      targetRect.top + targetRect.height / 2
    )
  );

  let left = 16;

  if (pageRect) {
    left = Math.max(
      12,
      pageRect.left - 92
    );
  }

  indicator.style.top = `${top}px`;
  indicator.style.left = `${left}px`;

  indicator.classList.remove('find-location-pulse');
  void indicator.offsetWidth;

  indicator.classList.add('visible');
  indicator.classList.add('find-location-pulse');

  clearTimeout(indicator._hideTimer);

  indicator._hideTimer = setTimeout(() => {
    indicator.classList.remove('visible');
    indicator.classList.remove('find-location-pulse');
  }, 2400);
}

function hideFindLocationIndicator() {
  const indicator = document.getElementById('findLocationIndicator');

  if (!indicator) return;

  indicator.classList.remove('visible');
  indicator.classList.remove('find-location-pulse');
}

function flashFindResult(element) {
  if (!element) return;

  let marker = document.getElementById('naviFindMarker');

  if (!marker) {
    marker = document.createElement('div');
    marker.id = 'naviFindMarker';

    document.body.appendChild(marker);
  }

  const label =
    activeFindIndex >= 0 && activeFindResults.length
      ? `${activeFindIndex + 1}/${activeFindResults.length}`
      : 'Match';

  const rect = element.getBoundingClientRect();

  const page =
    document.querySelector('.editor-page') ||
    document.getElementById('editor');

  const pageRect =
    page?.getBoundingClientRect();

  const top = Math.max(
    70,
    Math.min(
      window.innerHeight - 50,
      rect.top + rect.height / 2
    )
  );

  let left = 12;

  if (pageRect) {
    left = pageRect.left - 78;

    if (left < 8) {
      left = pageRect.right + 12;
    }
  }

  marker.textContent = `▶ ${label}`;

  marker.style.position = 'fixed';
  marker.style.zIndex = '999999';
  marker.style.left = `${left}px`;
  marker.style.top = `${top}px`;
  marker.style.transform = 'translateY(-50%)';
  marker.style.background = '#7c3aed';
  marker.style.color = '#ffffff';
  marker.style.padding = '7px 10px';
  marker.style.borderRadius = '999px';
  marker.style.fontSize = '12px';
  marker.style.fontWeight = '800';
  marker.style.fontFamily = 'Arial, Helvetica, sans-serif';
  marker.style.boxShadow = '0 8px 28px rgba(124, 58, 237, 0.38)';
  marker.style.pointerEvents = 'none';
  marker.style.opacity = '1';
  marker.style.whiteSpace = 'nowrap';

  clearTimeout(marker._hideTimer);

  marker._hideTimer = setTimeout(() => {
    marker.style.opacity = '0';
  }, 2600);
}

function getDocPlainTextForStats(doc) {
  if (!doc) return '';

  if (doc.id === currentDocumentId && window.NaviEditor) {
    return NaviEditor.getEditorText();
  }

  return doc.plainText || '';
}

async function getCurrentProjectStats() {
  if (!currentDocumentId) {
    return {
      rootId: null,
      words: 0,
      chars: 0,
      docs: []
    };
  }

  const rootId = await getProjectRootDocumentId(currentDocumentId);

  if (!rootId) {
    return {
      rootId: null,
      words: 0,
      chars: 0,
      docs: []
    };
  }

  const docs = await getProjectDocuments(rootId);

  let words = 0;
  let chars = 0;

  docs.forEach(doc => {
    const text = getDocPlainTextForStats(doc);

    words += NaviEditor.countWords(text);
    chars += text.length;
  });

  return {
    rootId,
    words,
    chars,
    docs
  };
}

async function getDailyGoalState(rootId, currentWords, targetWords, targetDate) {
  const todayKey = getTodayKey();

  const settingKey = `dailyGoal:${rootId}`;

  let state = await NaviStorage.getSetting(settingKey, null);

  const target = new Date(`${targetDate}T23:59:59`);
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;

  const daysLeft = Math.max(
    1,
    Math.ceil((target - now) / msPerDay)
  );

  const remainingTotal = Math.max(
    0,
    Number(targetWords || 0) - Number(currentWords || 0)
  );

  const recommendedPerDay = Math.ceil(
    remainingTotal / daysLeft
  );

  if (
    !state ||
    state.date !== todayKey ||
    state.targetWords !== Number(targetWords || 0) ||
    state.targetDate !== targetDate
  ) {
    state = {
      date: todayKey,
      rootId,
      startWords: currentWords,
      targetWords: Number(targetWords || 0),
      targetDate,
      dailyTarget: recommendedPerDay
    };

    await NaviStorage.saveSetting(settingKey, state);
  }

  const writtenToday = Math.max(
    0,
    currentWords - Number(state.startWords || 0)
  );

  const remainingToday = Math.max(
    0,
    Number(state.dailyTarget || 0) - writtenToday
  );

  const todayPercent =
    state.dailyTarget > 0
      ? Math.min(100, Math.round((writtenToday / state.dailyTarget) * 100))
      : 0;

  return {
    ...state,
    currentWords,
    writtenToday,
    remainingToday,
    remainingTotal,
    recommendedPerDay,
    daysLeft,
    todayPercent
  };
}

async function updateDailyGoalDisplay() {
  if (!els.dailyGoalOutput || !els.dailyGoalBarFill) return;

  const goal = await NaviStorage.getSetting('longGoal', null);

  if (!goal || !goal.words || !goal.date || !currentDocumentId) {
    els.dailyGoalOutput.textContent = 'No daily goal data yet.';
    els.dailyGoalBarFill.style.width = '0%';
    return;
  }

  const projectStats = await getCurrentProjectStats();

  if (!projectStats.rootId) {
    els.dailyGoalOutput.textContent = 'No project selected.';
    els.dailyGoalBarFill.style.width = '0%';
    return;
  }

  const state = await getDailyGoalState(
    projectStats.rootId,
    projectStats.words,
    Number(goal.words),
    goal.date
  );

  els.dailyGoalOutput.textContent =
    `Today: ${state.writtenToday}/${state.dailyTarget} words • ${state.remainingToday} left today • ${state.recommendedPerDay}/day after today`;

  els.dailyGoalBarFill.style.width =
    `${state.todayPercent}%`;
}

async function updateLongGoalDisplay() {
  if (!els.longGoalOutput) return;

  const goal = await NaviStorage.getSetting('longGoal', null);

  if (!goal || !goal.words || !goal.date) {
    els.longGoalOutput.textContent = 'No long goal set.';
    return;
  }

  const stats = NaviEditor.getEditorStats();
  const remainingWords = Math.max(0, Number(goal.words) - stats.words);

  const today = new Date();
  const target = new Date(goal.date + 'T23:59:59');

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.max(1, Math.ceil((target - today) / msPerDay));

  const perDay = Math.ceil(remainingWords / daysLeft);

  els.longGoalOutput.textContent =
    `${remainingWords} words left • ${daysLeft} day${daysLeft === 1 ? '' : 's'} • ${perDay}/day`;

    updateDailyGoalDisplay();
}

async function extractTextFromPdfFile(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js is not loaded.');
  }

  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    disableWorker: true
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const textContent = await page.getTextContent({
      disableCombineTextItems: false
    });

    const lines = buildLinesFromPdfItems(textContent.items);

    const pageText = lines
      .map(line => line.text.trim())
      .filter(Boolean)
      .join('\n');

    if (pageText.trim()) {
      pages.push(pageText.trim());
    }
  }

  return pages.join('\n\n');
}

function buildLinesFromPdfItems(items) {
  const rows = [];

  for (const item of items) {
    const text = item.str || '';

    if (!text.trim()) continue;

    const transform = item.transform || [];

    const x = transform[4] || 0;
    const y = transform[5] || 0;

    let row = rows.find(existing => {
      return Math.abs(existing.y - y) < 3;
    });

    if (!row) {
      row = {
        y,
        parts: []
      };

      rows.push(row);
    }

    row.parts.push({
      x,
      text
    });
  }

  rows.sort((a, b) => b.y - a.y);

  return rows.map(row => {
    row.parts.sort((a, b) => a.x - b.x);

    return {
      y: row.y,
      text: joinPdfLineParts(row.parts)
    };
  });
}

function joinPdfLineParts(parts) {
  let result = '';

  for (const part of parts) {
    const text = part.text || '';

    if (!result) {
      result = text;
      continue;
    }

    const previous = result[result.length - 1];

    const shouldJoinWithoutSpace =
      previous === '-' ||
      text.startsWith('.') ||
      text.startsWith(',') ||
      text.startsWith(';') ||
      text.startsWith(':') ||
      text.startsWith('!') ||
      text.startsWith('?') ||
      text.startsWith('”') ||
      text.startsWith('’');

    result += shouldJoinWithoutSpace
      ? text
      : ' ' + text;
  }

  return result.replace(/\s+/g, ' ').trim();
}

function extractChapterTitleMap(text) {
  const result = new Map();

  const introIndex = text.search(/Introduction\s+DESCRIPTION/i);

  const tocText =
    introIndex > 0
      ? text.slice(0, introIndex)
      : text.slice(0, Math.min(text.length, 6000));

  const regex =
    /(?:^|\s)(?:\d+\s+)?Chapter\s+(\d+)\s*:\s*([A-Za-z0-9'‘’" -]{1,45}?)\s+\d+(?=\s+(?:\d+\s+)?Chapter|\s+Introduction|\s*$)/gi;

  let match;

  while ((match = regex.exec(tocText)) !== null) {
    const number = Number(match[1]);
    const title = String(match[2] || '').trim();

    if (!number || !title) continue;

    result.set(number, title);
  }

  console.log(
    'TOC chapter title map:',
    Array.from(result.entries())
  );

  return result;
}

function splitIntoChapters(text, titleMap = new Map()) {
  const headingRegex =
    /\b(?:\d+\s+)?Chapter\s+(\d+)\s*:/gi;

  const rawMatches = [...text.matchAll(headingRegex)];

  const seenNumbers = new Set();
  const matches = [];

  for (const match of rawMatches) {
    const chapterNumber = Number(match[1]);

    if (!chapterNumber) continue;

    if (titleMap.size && !titleMap.has(chapterNumber)) {
      continue;
    }

    if (seenNumbers.has(chapterNumber)) {
      continue;
    }

    seenNumbers.add(chapterNumber);
    matches.push(match);
  }

  matches.sort((a, b) => a.index - b.index);

  console.log(
    'Accepted chapter headings:',
    matches.map(match => match[0])
  );

  if (matches.length < 2) {
    return [];
  }

  const chapters = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    const chapterNumber = Number(match[1]);

    const start = match.index;

    const end =
      i + 1 < matches.length
        ? matches[i + 1].index
        : text.length;

    const tocTitle =
      titleMap.get(chapterNumber) ||
      `Chapter ${chapterNumber}`;

    const cleanTitle =
      `Chapter ${chapterNumber}: ${tocTitle}`;

    let chapterText =
      text.slice(start, end).trim();

    chapterText = forceCleanChapterStart(
      chapterText,
      chapterNumber,
      tocTitle,
      cleanTitle
    );

    chapterText = cleanupChapterText(
      chapterText,
      chapterNumber,
      tocTitle
    );

    if (chapterText.length > 300) {
      chapters.push({
        title: cleanTitle,
        text: chapterText,
        number: chapterNumber
      });
    }
  }

  console.log(
    'Final chapter objects:',
    chapters.map(chapter => ({
      title: chapter.title,
      words: NaviEditor.countWords(chapter.text)
    }))
  );

  return chapters;
}

function forceCleanChapterStart(chapterText, chapterNumber, tocTitle, cleanTitle) {
  let result = String(chapterText || '');

  const headingPattern = new RegExp(
    '^\\s*(?:\\d+\\s+)?Chapter\\s+' +
      chapterNumber +
      '\\s*:\\s*' +
      escapeRegExp(tocTitle),
    'i'
  );

  result = result.replace(
    headingPattern,
    cleanTitle + '\n\n'
  );

  return result;
}

function cleanupChapterText(text, chapterNumber, tocTitle) {
  let result = String(text || '');

  // Remove repeated running title/header.
  result = result.replace(
    /JOY:\s*TIS\s*BUT\s*A\s*PRIVILEGE/gi,
    ''
  );

  // Normalize the actual chapter heading and remove repeated internal headings.
  result = removeRepeatedChapterHeadings(
    result,
    chapterNumber,
    tocTitle
  );

  // Remove standalone page numbers.
  result = result.replace(
    /^\s*\d{1,4}\s*$/gm,
    ''
  );

  // Remove page numbers wedged between sentence fragments.
  result = result.replace(
    /([a-z,”"’])\s+\d{1,4}\s+([a-z“"‘])/g,
    '$1 $2'
  );

  // Common PDF extraction weirdness.
  result = result.replace(/\bA nd\b/g, 'And');
  result = result.replace(/\bT he\b/g, 'The');
  result = result.replace(/\bI t\b/g, 'It');
  result = result.replace(/\bS he\b/g, 'She');
  result = result.replace(/\bH e\b/g, 'He');
  result = result.replace(/\bW e\b/g, 'We');

  result = repairOneLetterWordSpacing(result);

  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');

  result = repairChapterOpeningDropCap(result);
result = removeStrayOpeningLetters(result);

return result.trim();
}

function removeRepeatedChapterHeadings(text, chapterNumber, tocTitle) {
  let result = String(text || '');

  if (!chapterNumber || !tocTitle) {
    return result;
  }

  const safeTitle = escapeRegExp(tocTitle);

  const headingRegex = new RegExp(
    '(?:^|\\n|\\s)(?:\\d+\\s+)?(?:C\\s*)?HAPTER\\s+' +
      chapterNumber +
      '\\s*:\\s*' +
      safeTitle +
      '\\s*',
    'gi'
  );

  let seenFirstHeading = false;

  result = result.replace(headingRegex, match => {
    if (!seenFirstHeading) {
      seenFirstHeading = true;
      return `\nChapter ${chapterNumber}: ${tocTitle}\n\n`;
    }

    return '\n';
  });

  return result;
}

function removeStrayOpeningLetters(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    return String(text || '');
  }

  const titleIndex = paragraphs.findIndex(paragraph =>
    /^Chapter\s+\d+\s*:/i.test(paragraph)
  );

  const bodyIndex =
    titleIndex >= 0
      ? titleIndex + 1
      : 0;

  if (!paragraphs[bodyIndex]) {
    return paragraphs.join('\n\n');
  }

  const firstBodyFirstLetter =
    paragraphs[bodyIndex].trim()[0] || '';

  /*
    Remove stray single-letter drop caps at the beginning
    of the next few paragraphs.

    Examples:
    "T We trudged..." -> "We trudged..."
    "I I so desperately..." -> "I so desperately..."
    "A A choir..." -> "A choir..."
  */
  for (
    let i = bodyIndex + 1;
    i < Math.min(paragraphs.length, bodyIndex + 6);
    i++
  ) {
    const paragraph = paragraphs[i];

    const match = paragraph.match(/^([A-Z])\s+(.+)/);

    if (!match) continue;

    const strayLetter = match[1];
    const rest = match[2].trim();

    if (!rest) continue;

    const restFirstLetter = rest[0];

    const looksLikeDuplicate =
      strayLetter === firstBodyFirstLetter ||
      strayLetter === restFirstLetter;

    const looksLikeNotARealOneLetterWord =
      !['I', 'A'].includes(strayLetter);

    if (looksLikeDuplicate || looksLikeNotARealOneLetterWord) {
      paragraphs[i] = rest;
    }
  }

  return paragraphs.join('\n\n');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createChapterDocs(manuscript, chapterItems) {
  for (const item of chapterItems) {
    const title =
      item.title ||
      'Untitled Chapter';

    const chapterText =
      item.text ||
      '';

    const chapterDoc =
      NaviStorage.createBlankDocument(title);

    chapterDoc.parentId = manuscript.id;
    chapterDoc.docType = 'chapter';

    chapterDoc.content =
      pdfTextToHtml(chapterText);

    chapterDoc.plainText =
      chapterText;

    chapterDoc.wordCount =
      NaviEditor.countWords(chapterText);

    chapterDoc.charCount =
      chapterText.length;

    chapterDoc.importedFrom =
      manuscript.importedFrom || '';

    await NaviStorage.saveDocument(chapterDoc);
  }
}

function cleanupImportedPdfText(text) {
  let result = String(text || '');

  const lines = result.split('\n');

  const frequency = new Map();

  lines.forEach(line => {
    const clean = line.trim();

    if (clean.length < 5) return;

    frequency.set(
      clean,
      (frequency.get(clean) || 0) + 1
    );
  });

  const repeatedLines = new Set(
    Array.from(frequency.entries())
      .filter(([, count]) => count > 5)
      .map(([line]) => line)
  );

  result = lines
    .filter(line => !repeatedLines.has(line.trim()))
    .join('\n');

  result = result.replace(
    /^\s*\d+\s*$/gm,
    ''
  );

  result = result.replace(
    /^page\s+\d+\s*$/gim,
    ''
  );

  result = result.replace(
    /\n{3,}/g,
    '\n\n'
  );

  //result = result.replace(
 // /(Chapter\s+\d+[:\-\s][A-Za-z0-9 ]+)\s+([A-Z])/g,
 // '$1\n\n$2'
//);
result = result.replace(
  /JOY:\s*TIS\s*BUT\s*A\s*PRIVILEGE/g,
  ''
);


  return result.trim();
}

function reflowImportedText(text) {
  const lines = String(text || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const blocks = [];
  let current = [];

  function flush() {
    if (!current.length) return;

    blocks.push(current.join(' '));
    current = [];
  }

  for (const line of lines) {
    if (/^Chapter\s+\d+\s*:/i.test(line)) {
      flush();
      blocks.push(line);
      continue;
    }

    if (/^\d{1,4}$/.test(line)) {
      continue;
    }

    current.push(line);

    if (/[.!?…“”"’)]$/.test(line)) {
      flush();
    }
  }

  flush();

  return blocks.join('\n\n');
}

function pdfTextToHtml(text) {
  const clean = reflowImportedText(
    String(text || '').trim()
  );

  if (!clean) {
    return '<p></p>';
  }

  return clean
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtml(block)}</p>`)
    .join('');
}

async function handlePdfImportClick() {
  if (els.pdfInput) {
    els.pdfInput.click();
  }
}

function removeTableOfContents(text) {
  const introIndex = text.search(
    /Introduction\s+DESCRIPTION/i
  );

  if (introIndex > 0) {
    return text.slice(introIndex);
  }

  const chapterOneIndex = text.search(
    /\b1\s+Chapter\s+1\s*:\s*/i
  );

  if (chapterOneIndex > 0) {
    return text.slice(chapterOneIndex);
  }

  return text;
}

async function handlePdfImportFile(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    NaviEditor.setSaveStatus('Importing PDF...');

    const text = await extractTextFromPdfFile(file);

    if (!text.trim()) {
      showAppNotice('No selectable text was found. This may be a scanned/image PDF.');
      return;
    }

    const baseCleanedText =
  cleanupImportedPdfText(text);

const titleMap =
  extractChapterTitleMap(baseCleanedText);

const cleanedText =
  removeTableOfContents(baseCleanedText);

console.log(
  cleanedText.slice(0, 5000)
);

  console.log(
  cleanedText.slice(0, 5000)
);

const title =
  file.name.replace(/\.pdf$/i, '') ||
  'Imported PDF';


const chapters =
  splitIntoChapters(cleanedText, titleMap);

  console.log(
  `PDF import detected ${chapters.length} chapter candidates.`
);

if (chapters.length > 1) {

  const manuscript =
    NaviStorage.createBlankDocument(title);

  manuscript.docType = 'manuscript';

  manuscript.parentId = pendingPdfParentId;

  manuscript.content =
    `<h1>${escapeHtml(title)}</h1><p>Imported from PDF</p>`;

  manuscript.plainText =
    title;

  manuscript.importedFrom =
    file.name;

  const savedManuscript =
    await NaviStorage.saveDocument(
      manuscript
    );

  await createChapterDocs(
    savedManuscript,
    chapters
  );

  await loadDocuments();
  await openDocument(
    savedManuscript.id
  );

  NaviEditor.setSaveStatus(
    `Imported ${chapters.length} chapters`
  );

} else {

  const doc =
    NaviStorage.createBlankDocument(
      title
    );

  doc.docType = 'pdf';

  doc.parentId = pendingPdfParentId;

  doc.content =
    pdfTextToHtml(cleanedText);
  
  doc.status = getDefaultStatusForDoc(doc);

  doc.plainText =
    cleanedText;

  doc.wordCount =
    NaviEditor.countWords(
      cleanedText
    );

  doc.charCount =
    cleanedText.length;

  doc.importedFrom =
    file.name;

  const saved =
    await NaviStorage.saveDocument(
      doc
    );

  await loadDocuments();
  await openDocument(saved.id);

  NaviEditor.setSaveStatus(
    'PDF imported'
  );
}
  } catch (error) {
  console.error('PDF ERROR:', error);

  await showAppError(
  error?.message || String(error),
  'PDF import failed'
);

  NaviEditor.setSaveStatus('PDF import error');
  } finally {
  pendingPdfParentId = null;
    event.target.value = '';
  }
}

function openSubdocTypeModal() {
  if (!els.subdocTypeModal) return;

  els.subdocTypeModal.classList.remove('hidden');
}

function closeSubdocTypeModal() {
  if (!els.subdocTypeModal) return;

  els.subdocTypeModal.classList.add('hidden');
}

async function handleNewSubDocument() {
  openSubdocTypeModal();
}

async function createSubDocumentOfType(type) {
  const normalizedType =
    String(type || 'general')
      .trim()
      .toLowerCase();

  if (normalizedType === 'pdf') {
    await openPdfSubdocModal();
    return;
  }
  
  if (isMatterPresetType(normalizedType)) {
  closeSubdocTypeModal();
}


  const config =
    await getSubdocTypeConfig(normalizedType);

  if (!config) {
    return;
  }

  const parentId =
    currentDocumentId || null;

  const parent =
    parentId
      ? await NaviStorage.getDocument(parentId)
      : null;

  const doc =
    NaviStorage.createBlankDocument(config.title);

  doc.docType = config.type;
doc.parentId = parentId;
doc.folder = parent?.folder || '';

doc.status = getDefaultStatusForDoc(doc);
doc.pov = doc.pov || '';
doc.location = doc.location || '';
doc.timeline = doc.timeline || '';
doc.characters = doc.characters || '';
doc.summary = doc.summary || '';

doc.content = config.content;
doc.plainText = config.plainText;
doc.wordCount = NaviEditor.countWords(config.plainText);
doc.charCount = config.plainText.length;

  if (config.type === 'pdf') {
    doc.importedFrom = '';
    doc.importDate = Date.now();
  }

  const saved =
    await NaviStorage.saveDocument(doc);

  closeSubdocTypeModal();

  await loadDocuments();
  await openDocument(saved.id);

  NaviEditor.focusEditor();

  if (config.type === 'cover') {
    chooseCoverImageForDocument(saved.id);
  }
}

const MATTER_PRESET_DEFINITIONS = {
  front: {
    title: 'Choose Front Matter Preset',
    subtitle: 'Opening pages before the main body of the book.',
    presets: [
      {
        key: 'title',
        icon: '📖',
        title: 'Title Page',
        desc: 'Book title, subtitle, and author name.'
      },
      {
        key: 'copyright',
        icon: '©️',
        title: 'Copyright',
        desc: 'Copyright notice, rights statement, and fiction disclaimer.'
      },
      {
        key: 'dedication',
        icon: '💌',
        title: 'Dedication',
        desc: 'A short dedication page.'
      },
      {
        key: 'epigraph',
        icon: '❝',
        title: 'Epigraph',
        desc: 'A quote or excerpt before the story begins.'
      },
      {
        key: 'preface',
        icon: '📝',
        title: 'Preface',
        desc: 'A short introductory note before the main text.'
      },
      {
        key: 'attributions',
        icon: '📎',
        title: 'Attributions',
        desc: 'Credits, permissions, references, and source acknowledgments.'
      },
      {
        key: 'blank',
        icon: '⬜',
        title: 'Blank',
        desc: 'An empty front matter document.'
      }
    ]
  },

  body: {
    title: 'Choose Body Matter Preset',
    subtitle: 'Main story/book content that belongs between front and back matter.',
    presets: [
      {
        key: 'prologue',
        icon: '🌒',
        title: 'Prologue',
        desc: 'Opening story material before Chapter 1.'
      },
      {
        key: 'part',
        icon: 'Ⅰ',
        title: 'Part Break',
        desc: 'A large book division, like Part I or Part II.'
      },
      {
        key: 'interlude',
        icon: '⏳',
        title: 'Interlude',
        desc: 'A short break or bridge between major sections.'
      },
      {
        key: 'epilogue',
        icon: '🌅',
        title: 'Epilogue',
        desc: 'Closing story material after the final chapter.'
      },
      {
        key: 'scene',
        icon: '🎬',
        title: 'Scene',
        desc: 'A flexible scene or main-body fragment.'
      },
      {
        key: 'blank',
        icon: '⬜',
        title: 'Blank',
        desc: 'An empty body matter document.'
      }
    ]
  },

  back: {
    title: 'Choose Back Matter Preset',
    subtitle: 'Closing pages after the main body of the book.',
    presets: [
      {
        key: 'acknowledgments',
        icon: '🙏',
        title: 'Acknowledgments',
        desc: 'Thank people, communities, or contributors.'
      },
      {
        key: 'about-author',
        icon: '✍️',
        title: 'About the Author',
        desc: 'Author biography or author note.'
      },
      {
        key: 'appendix',
        icon: '📂',
        title: 'Appendix',
        desc: 'Extra reference material or supplemental content.'
      },
      {
        key: 'glossary',
        icon: '🔤',
        title: 'Glossary',
        desc: 'Terms and definitions.'
      },
      {
        key: 'endnotes',
        icon: '🔢',
        title: 'Endnotes',
        desc: 'Numbered notes or references.'
      },
      {
        key: 'blank',
        icon: '⬜',
        title: 'Blank',
        desc: 'An empty back matter document.'
      }
    ]
  }
};

function openMatterPresetPicker(kind) {
  const definition =
    MATTER_PRESET_DEFINITIONS[kind];

  if (
    !definition ||
    !els.matterPresetModal ||
    !els.matterPresetGrid
  ) {
    return Promise.resolve(null);
  }

  pendingMatterPresetKind = kind;

  if (els.matterPresetTitle) {
    els.matterPresetTitle.textContent = definition.title;
  }

  if (els.matterPresetSubtitle) {
    els.matterPresetSubtitle.textContent = definition.subtitle;
  }

  els.matterPresetGrid.innerHTML = '';

  definition.presets.forEach(preset => {
    const card = document.createElement('button');

    card.type = 'button';
    card.className = 'matter-preset-card';
    card.dataset.presetKey = preset.key;

    card.innerHTML = `
      <span class="matter-preset-icon">${preset.icon}</span>
      <span class="matter-preset-main">${escapeHtml(preset.title)}</span>
      <span class="matter-preset-desc">${escapeHtml(preset.desc)}</span>
    `;

    card.onclick = () => {
      resolveMatterPresetPicker(preset.key);
    };

    els.matterPresetGrid.appendChild(card);
  });

  els.matterPresetModal.classList.remove('hidden');

  return new Promise(resolve => {
    pendingMatterPresetResolve = resolve;
  });
}

function resolveMatterPresetPicker(value = null) {
  if (els.matterPresetModal) {
    els.matterPresetModal.classList.add('hidden');
  }

  const resolver =
    pendingMatterPresetResolve;

  pendingMatterPresetResolve = null;
  pendingMatterPresetKind = '';

  if (resolver) {
    resolver(value);
  }
}

function closeMatterPresetPicker() {
  resolveMatterPresetPicker(null);
}

function normalizePresetChoice(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function currentYearString() {
  return String(new Date().getFullYear());
}

async function getFrontMatterPresetConfig() {
  const meta =
    await getProjectMetadata();

  const choice =
    await openMatterPresetPicker('front');

  if (choice === null) return null;

  const preset =
    normalizePresetChoice(choice);

  const bookTitle =
    meta.title || 'Book Title';

  const subtitle =
    meta.subtitle || '';

  const author =
    meta.author || 'Author Name';

  if (preset === 'copyright') {
    return {
      type: 'front-matter',
      title: 'Copyright',
      content:
        `<h1>Copyright</h1>` +
        `<p>Copyright © ${currentYearString()} ${escapeHtml(author)}.</p>` +
        `<p>All rights reserved.</p>` +
        `<p>This is a work of fiction. Names, characters, places, and incidents are either products of the author’s imagination or used fictitiously.</p>`,
      plainText:
        `Copyright Copyright © ${currentYearString()} ${author}. All rights reserved. This is a work of fiction.`
    };
  }

  if (preset === 'dedication') {
    return {
      type: 'front-matter',
      title: 'Dedication',
      content:
        '<h1>Dedication</h1>' +
        '<p>For...</p>',
      plainText:
        'Dedication For...'
    };
  }

  if (preset === 'epigraph') {
    return {
      type: 'front-matter',
      title: 'Epigraph',
      content:
        '<h1>Epigraph</h1>' +
        '<blockquote><p>Add quote or excerpt here.</p></blockquote>' +
        '<p>— Attribution</p>',
      plainText:
        'Epigraph Add quote or excerpt here. — Attribution'
    };
  }

  if (preset === 'preface') {
    return {
      type: 'front-matter',
      title: 'Preface',
      content:
        '<h1>Preface</h1>' +
        '<p>Add preface text here.</p>',
      plainText:
        'Preface Add preface text here.'
    };
  }

  if (
    preset === 'attributions' ||
    preset === 'attribution'
  ) {
    return {
      type: 'front-matter',
      title: 'Attributions',
      content:
        '<h1>Attributions</h1>' +
        '<p>List credited sources, permissions, image credits, references, inspirations, or included materials here.</p>',
      plainText:
        'Attributions List credited sources, permissions, image credits, references, inspirations, or included materials here.'
    };
  }

  if (preset === 'blank') {
    return {
      type: 'front-matter',
      title: 'Front Matter',
      content:
        '<h1>Front Matter</h1><p></p>',
      plainText:
        'Front Matter'
    };
  }

  return {
    type: 'front-matter',
    title: 'Title Page',
    content:
      `<section class="title-page">` +
      `<h1>${escapeHtml(bookTitle)}</h1>` +
      `${subtitle ? `<p class="book-subtitle">${escapeHtml(subtitle)}</p>` : ''}` +
      `<p class="book-author">${escapeHtml(author)}</p>` +
      `</section>`,
    plainText:
      `${bookTitle} ${subtitle} ${author}`
  };
}

async function getBackMatterPresetConfig() {
  const meta =
    await getProjectMetadata();

  const choice =
    await openMatterPresetPicker('back');

  if (choice === null) return null;

  const preset =
    normalizePresetChoice(choice);

  const author =
    meta.author || 'Author Name';

  if (
    preset === 'about-author' ||
    preset === 'about-the-author'
  ) {
    return {
      type: 'back-matter',
      title: 'About the Author',
      content:
        '<h1>About the Author</h1>' +
        `<p>${escapeHtml(author)} is...</p>`,
      plainText:
        `About the Author ${author} is...`
    };
  }

  if (preset === 'appendix') {
    return {
      type: 'back-matter',
      title: 'Appendix',
      content:
        '<h1>Appendix</h1>' +
        '<p>Add appendix material here.</p>',
      plainText:
        'Appendix Add appendix material here.'
    };
  }

  if (preset === 'glossary') {
    return {
      type: 'back-matter',
      title: 'Glossary',
      content:
        '<h1>Glossary</h1>' +
        '<p><strong>Term:</strong> Definition.</p>',
      plainText:
        'Glossary Term: Definition.'
    };
  }

  if (preset === 'endnotes') {
    return {
      type: 'back-matter',
      title: 'Endnotes',
      content:
        '<h1>Endnotes</h1>' +
        '<ol><li>Add note here.</li></ol>',
      plainText:
        'Endnotes Add note here.'
    };
  }

  if (preset === 'blank') {
    return {
      type: 'back-matter',
      title: 'Back Matter',
      content:
        '<h1>Back Matter</h1><p></p>',
      plainText:
        'Back Matter'
    };
  }

  return {
    type: 'back-matter',
    title: 'Acknowledgments',
    content:
      '<h1>Acknowledgments</h1>' +
      '<p>Add acknowledgments here.</p>',
    plainText:
      'Acknowledgments Add acknowledgments here.'
  };
}

async function getBodyMatterPresetConfig() {
  const choice =
    await openMatterPresetPicker('body');

  if (choice === null) return null;

  const preset =
    normalizePresetChoice(choice);

  if (preset === 'part') {
    return {
      type: 'body-matter',
      title: 'Part I',
      content:
        '<h1>Part I</h1><p></p>',
      plainText:
        'Part I'
    };
  }

  if (preset === 'interlude') {
    return {
      type: 'body-matter',
      title: 'Interlude',
      content:
        '<h1>Interlude</h1><p></p>',
      plainText:
        'Interlude'
    };
  }

  if (preset === 'epilogue') {
    return {
      type: 'body-matter',
      title: 'Epilogue',
      content:
        '<h1>Epilogue</h1><p></p>',
      plainText:
        'Epilogue'
    };
  }

  if (preset === 'scene') {
    return {
      type: 'body-matter',
      title: 'Scene',
      content:
        '<h1>Scene</h1><p></p>',
      plainText:
        'Scene'
    };
  }

  if (preset === 'blank') {
    return {
      type: 'body-matter',
      title: 'Body Matter',
      content:
        '<h1>Body Matter</h1><p></p>',
      plainText:
        'Body Matter'
    };
  }

  return {
    type: 'body-matter',
    title: 'Prologue',
    content:
      '<h1>Prologue</h1><p></p>',
    plainText:
      'Prologue'
  };
}

async function getSubdocTypeConfig(type) {
  if (type === 'cover') {
    return {
      type: 'cover',
      title: 'Cover',
      content:
        '<h1>Cover</h1>' +
        '<p>Choose a cover image for this project.</p>',
      plainText:
        'Cover Choose a cover image for this project.'
    };
  }

  if (type === 'front-matter') {
    return await getFrontMatterPresetConfig();
  }

  if (type === 'back-matter') {
    return await getBackMatterPresetConfig();
  }

  if (type === 'body-matter') {
    return await getBodyMatterPresetConfig();
  }

  if (type === 'chapter') {
    return {
      type: 'chapter',
      title: 'New Chapter',
      content: '<h1>New Chapter</h1><p></p>',
      plainText: 'New Chapter'
    };
  }

  if (type === 'notes') {
    return {
      type: 'notes',
      title: 'New Notes',
      content: '<h1>Notes</h1><p></p>',
      plainText: 'Notes'
    };
  }

  if (type === 'research') {
    return {
      type: 'research',
      title: 'New Research',
      content: '<h1>Research</h1><p></p>',
      plainText: 'Research'
    };
  }

  if (type === 'pdf') {
    return {
      type: 'pdf',
      title: 'Imported PDF Notes',
      content:
        '<h1>Imported PDF</h1>' +
        '<p>Use PDF Import to bring text into this document.</p>',
      plainText:
        'Imported PDF Use PDF Import to bring text into this document.'
    };
  }

  return {
    type: 'general',
    title: 'New Subdocument',
    content: '<h1>New Subdocument</h1><p></p>',
    plainText: 'New Subdocument'
  };
}

async function handleNewChapterDocument() {
  const title = prompt('Chapter title?', 'Chapter 1');

  if (!title) return;

  const doc = NaviStorage.createBlankDocument(title.trim());

  doc.docType = 'chapter';
  doc.content = `<h1>${escapeHtml(title.trim())}</h1><p></p>`;
  doc.plainText = title.trim();
  doc.wordCount = NaviEditor.countWords(doc.plainText);
  doc.charCount = doc.plainText.length;

  if (currentDocumentId) {
    const current = await NaviStorage.getDocument(currentDocumentId);

    if (current?.docType === 'manuscript') {
      doc.parentId = current.id;
    } else if (current?.parentId) {
      doc.parentId = current.parentId;
    }
  }

  const saved = await NaviStorage.saveDocument(doc);

  await loadDocuments();
  await openDocument(saved.id);
}

let activeFindResults = [];
let activeFindIndex = -1;

function getEditorSearchRoot() {
  const editor = document.getElementById('editor');

  if (!editor) return null;

  return editor.querySelector('.ProseMirror') || editor;
}

function buildTextIndex(root) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );

  const nodes = [];
  let text = '';
  let position = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.nodeValue || '';

    nodes.push({
      node,
      start: position,
      end: position + value.length
    });

    text += value;
    position += value.length;
  }

  return {
    text,
    nodes
  };
}

function findOccurrencesInText(text, query, contextWords = 8) {
  const needle = String(query || '').trim();

  if (!needle) return [];

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');

  const results = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const index = match.index;
    const value = match[0];

    const before = text
      .slice(0, index)
      .split(/\s+/)
      .filter(Boolean)
      .slice(-contextWords)
      .join(' ');

    const after = text
      .slice(index + value.length)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, contextWords)
      .join(' ');

    results.push({
      index,
      length: value.length,
      value,
      before,
      after
    });
  }

  return results;
}

function selectEditorTextRange(index, length) {
  const root = getEditorSearchRoot();

  if (!root) return false;

  const textIndex = buildTextIndex(root);

  const startInfo = textIndex.nodes.find(item => {
    return index >= item.start && index <= item.end;
  });

  const endPosition = index + length;

  const endInfo = textIndex.nodes.find(item => {
    return endPosition >= item.start && endPosition <= item.end;
  });

  if (!startInfo || !endInfo) {
    return false;
  }

  const startOffset = Math.max(
    0,
    index - startInfo.start
  );

  const endOffset = Math.max(
    0,
    endPosition - endInfo.start
  );

  const range = document.createRange();

  range.setStart(startInfo.node, startOffset);
  range.setEnd(endInfo.node, endOffset);

  const blockElement =
    startInfo.node.parentElement?.closest('p, div, li, h1, h2, h3, blockquote') ||
    startInfo.node.parentElement ||
    root;

  /*
    Use instant scroll instead of smooth scroll.
    Smooth scroll was making the marker chase the paragraph like a caffeinated mosquito.
  */
  blockElement.scrollIntoView({
    behavior: 'auto',
    block: 'center'
  });

  try {
    if (typeof root.focus === 'function') {
      root.focus({
        preventScroll: true
      });
    }

    const selection = window.getSelection();

    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } catch (error) {
    console.warn('Selection failed:', error);
  }

  flashFindResult(blockElement);

  return true;
}


function getHighlightedContext(result) {
  return `${escapeHtml(result.before)} <mark>${escapeHtml(result.value)}</mark> ${escapeHtml(result.after)}`;
}

async function openFindPanel(query = '') {
  if (!els.findPanel) return;

  els.findPanel.classList.remove('hidden');

  if (query && els.floatingFindInput) {
    els.floatingFindInput.value = query;
  }

  await runFloatingFind();

  if (activeFindResults.length) {
    activeFindIndex = 0;

    const first = activeFindResults[0];

    if (
      getFindScope() === 'project' &&
      first.docId &&
      first.docId !== currentDocumentId
    ) {
      await openDocument(first.docId);

      setTimeout(() => {
        selectEditorTextRange(
          first.index,
          first.length
        );
      }, 120);

      return;
    }

    selectEditorTextRange(
      first.index,
      first.length
    );
  }
}

function closeFindPanel() {
  if (!els.findPanel) return;

  const marker = document.getElementById('naviFindMarker');

  if (marker) {
    marker.style.opacity = '0';
  }

  els.findPanel.classList.add('hidden');
}

async function runFloatingFind() {
  const query = els.floatingFindInput?.value || '';
  const scope = getFindScope();

  if (!query.trim()) {
    const marker = document.getElementById('naviFindMarker');

    if (marker) {
      marker.style.opacity = '0';
    }

    activeFindResults = [];
    activeFindIndex = -1;

    if (els.findResultsSummary) {
      els.findResultsSummary.textContent = 'No search yet.';
    }

    if (els.findResultsList) {
      els.findResultsList.innerHTML = '';
    }

    return;
  }

  if (scope === 'project') {
    activeFindResults = await findOccurrencesAcrossProject(query);
    activeFindIndex = -1;
    renderFloatingFindResults();
    return;
  }

  const root = getEditorSearchRoot();

  if (!root) {
    activeFindResults = [];
    activeFindIndex = -1;
    renderFloatingFindResults();
    return;
  }

  const textIndex = buildTextIndex(root);

  activeFindResults = findOccurrencesInText(
    textIndex.text,
    query,
    8
  ).map(result => ({
    ...result,
    docId: currentDocumentId,
    docTitle: NaviEditor.getEditorTitle
      ? NaviEditor.getEditorTitle()
      : 'Current Document',
    scope: 'current'
  }));

  activeFindIndex = -1;

  renderFloatingFindResults();
}

function renderFloatingFindResults() {
  if (!els.findResultsSummary || !els.findResultsList) return;

  const query = els.floatingFindInput?.value || '';
  const count = activeFindResults.length;
  const scope = getFindScope();

  els.findResultsSummary.textContent =
    count
      ? `${count} match${count === 1 ? '' : 'es'} for "${query}" ${
          scope === 'project' ? 'across project' : 'in current document'
        }`
      : `No matches for "${query}"`;

  els.findResultsList.innerHTML = '';

  activeFindResults.forEach((result, index) => {
    const item = document.createElement('button');

    item.className = 'find-result-item';

    const docLabel =
      scope === 'project'
        ? `<div class="find-result-doc">${escapeHtml(result.docTitle || 'Untitled Document')}</div>`
        : '';

    item.innerHTML = `
      ${docLabel}
      <div class="find-result-context">
        ... ${getHighlightedContext(result)} ...
      </div>
    `;

    item.addEventListener('pointerdown', event => {
      event.preventDefault();
    });

    item.onclick = async () => {
      activeFindIndex = index;

      if (scope === 'project' && result.docId && result.docId !== currentDocumentId) {
        await openDocument(result.docId);

        /*
          Wait one tick so Tiptap/editor DOM actually loads the opened doc.
          Without this, it tries to jump before the chapter exists onscreen.
        */
        setTimeout(() => {
          selectEditorTextRange(
            result.index,
            result.length
          );
        }, 120);

        return;
      }

      selectEditorTextRange(
        result.index,
        result.length
      );
    };

    els.findResultsList.appendChild(item);
  });
}

function replaceSelectedFindResult() {
  const scope = getFindScope();

  if (scope === 'project') {
    showAppNotice('Open the result document first, then replace inside that document.');
    return;
  }

  const replacement = els.floatingReplaceInput?.value || '';

  if (activeFindIndex < 0) {
    showAppNotice('Select a match first.');
    return;
  }

  const result = activeFindResults[activeFindIndex];

  if (!result) return;

  const selected = selectEditorTextRange(
    result.index,
    result.length
  );

  if (!selected) return;

  document.execCommand('insertText', false, replacement);

  NaviEditor.updateCounts();
  scheduleAutosave();
  updateInspector();
  runFloatingFind();
}

function replaceAllFindResults() {
  const scope = getFindScope();

  if (scope === 'project') {
    showAppNotice('Project-wide replace is disabled for safety. Open a specific document to replace text there.');
    return;
  }

  const query = els.floatingFindInput?.value || '';
  const replacement = els.floatingReplaceInput?.value || '';

  if (!query.trim()) return;

  const count = NaviEditor.replaceAllInEditor
    ? NaviEditor.replaceAllInEditor(query, replacement)
    : NaviEditor.replaceAllText(query, replacement);

  scheduleAutosave();
  updateInspector();
  runFloatingFind();

  showAppNotice(`Replaced ${count} match${count === 1 ? '' : 'es'}.`);
}

function setupDraggableFindPanel() {
  const panel = els.findPanel;
  const handle = panel?.querySelector('.floating-panel-head');

  if (!panel || !handle) return;

  const savedPosition = localStorage.getItem('naviwriter-find-panel-position');

  if (savedPosition) {
    try {
      const parsed = JSON.parse(savedPosition);

      if (
        typeof parsed.left === 'number' &&
        typeof parsed.top === 'number'
      ) {
        panel.style.left = `${parsed.left}px`;
        panel.style.top = `${parsed.top}px`;
        panel.style.right = 'auto';
      }
    } catch {
      // Ignore bad saved position.
    }
  }

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener('pointerdown', event => {
    const clickedCloseButton = event.target.closest('button');

    if (clickedCloseButton) return;

    isDragging = true;

    const rect = panel.getBoundingClientRect();

    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    panel.classList.add('dragging');

    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', event => {
    if (!isDragging) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    const panelRect = panel.getBoundingClientRect();

    const maxLeft = window.innerWidth - panelRect.width - 8;
    const maxTop = window.innerHeight - panelRect.height - 8;

    const nextLeft = Math.max(
      8,
      Math.min(maxLeft, startLeft + dx)
    );

    const nextTop = Math.max(
      8,
      Math.min(maxTop, startTop + dy)
    );

    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    panel.style.right = 'auto';
  });

  handle.addEventListener('pointerup', event => {
    if (!isDragging) return;

    isDragging = false;

    panel.classList.remove('dragging');

    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release issues.
    }

    const rect = panel.getBoundingClientRect();

    localStorage.setItem(
      'naviwriter-find-panel-position',
      JSON.stringify({
        left: rect.left,
        top: rect.top
      })
    );
  });

  handle.addEventListener('pointercancel', () => {
    isDragging = false;
    panel.classList.remove('dragging');
  });
}

async function openPdfSubdocModal() {
  pendingPdfParentId = currentDocumentId || null;

  closeSubdocTypeModal();

  await renderExistingPdfList();

  if (els.pdfSubdocModal) {
    els.pdfSubdocModal.classList.remove('hidden');
  }
}

function closePdfSubdocModal() {
  if (!els.pdfSubdocModal) return;

  els.pdfSubdocModal.classList.add('hidden');
}

async function renderExistingPdfList() {
  if (!els.existingPdfList) return;

  const docs = await NaviStorage.getAllDocuments();

  const pdfDocs = docs.filter(doc => {
    return (
      doc.docType === 'pdf' ||
      String(doc.importedFrom || '').toLowerCase().endsWith('.pdf')
    );
  });

  if (!pdfDocs.length) {
    els.existingPdfList.innerHTML =
      '<div class="empty-note">No imported PDFs yet.</div>';
    return;
  }

  els.existingPdfList.innerHTML = '';

  pdfDocs.forEach(doc => {
    const item = document.createElement('button');

    item.className = 'existing-pdf-item';

    item.innerHTML = `
      <div class="existing-pdf-title">${escapeHtml(doc.title || 'Untitled PDF')}</div>
      <div class="existing-pdf-meta">
        ${Number(doc.wordCount || 0)} words
        ${doc.importedFrom ? ` • ${escapeHtml(doc.importedFrom)}` : ''}
      </div>
    `;

    item.onclick = () => {
      attachExistingPdfAsSubdoc(doc.id);
    };

    els.existingPdfList.appendChild(item);
  });
}

async function handleUploadPdfSubdoc() {
  pendingPdfParentId = currentDocumentId || null;

  closePdfSubdocModal();

  if (els.pdfInput) {
    els.pdfInput.click();
  }
}

async function createBlankPdfSubdoc() {
  const parent =
    currentDocumentId
      ? await NaviStorage.getDocument(currentDocumentId)
      : null;

  const doc =
    NaviStorage.createBlankDocument('PDF Notes');

  doc.docType = 'pdf';
  doc.parentId = currentDocumentId || null;
  doc.folder = parent?.folder || '';
  doc.status = getDefaultStatusForDoc(doc);
  doc.content = '<h1>PDF Notes</h1><p>Add notes or import PDF text here.</p>';
  doc.plainText = 'PDF Notes Add notes or import PDF text here.';
  doc.wordCount = NaviEditor.countWords(doc.plainText);
  doc.charCount = doc.plainText.length;
  doc.importedFrom = '';
  doc.importDate = Date.now();

  const saved = await NaviStorage.saveDocument(doc);

  closePdfSubdocModal();

  await loadDocuments();
  await openDocument(saved.id);

  NaviEditor.focusEditor();
  
}

const PROJECT_METADATA_KEY = 'naviwriter-project-metadata';

async function getProjectMetadata() {
  const saved =
    await NaviStorage.getSetting(PROJECT_METADATA_KEY, null);

  return {
    title: saved?.title || '',
    subtitle: saved?.subtitle || '',
    author: saved?.author || ''
  };
}

async function loadProjectMetadataFields() {
  const meta = await getProjectMetadata();

  if (els.projectTitleInput) {
    els.projectTitleInput.value = meta.title || '';
  }

  if (els.projectSubtitleInput) {
    els.projectSubtitleInput.value = meta.subtitle || '';
  }

  if (els.projectAuthorInput) {
    els.projectAuthorInput.value = meta.author || '';
  }
}

async function saveProjectMetadata() {
  const meta = {
    title: els.projectTitleInput?.value.trim() || '',
    subtitle: els.projectSubtitleInput?.value.trim() || '',
    author: els.projectAuthorInput?.value.trim() || '',
    updatedAt: Date.now()
  };

  await NaviStorage.saveSetting(PROJECT_METADATA_KEY, meta);

  NaviEditor.setSaveStatus('Project metadata saved');

  return meta;
}

function chooseCoverImageForDocument(docId) {
  if (!els.coverImageInput) {
    showAppNotice('Cover image input is missing.');
    return;
  }

  pendingCoverDocId = docId;
  els.coverImageInput.click();
}

async function handleCoverImageFile(event) {
  const file = event.target.files?.[0];

  if (!file || !pendingCoverDocId) {
    event.target.value = '';
    return;
  }

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(reader.error);
      };

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.readAsDataURL(file);
    });

    const doc = await NaviStorage.getDocument(pendingCoverDocId);

    if (!doc) {
      throw new Error('Cover document not found.');
    }

    const coverHtml = `
      <figure class="cover-page">
        <img src="${dataUrl}"/>
        <figcaption>${escapeHtml(file.name || 'Cover image')}</figcaption>
      </figure>
    `;

    const updated = {
      ...doc,
      content: coverHtml,
      plainText: doc.title || 'Cover',
      wordCount: NaviEditor.countWords(doc.title || 'Cover'),
      charCount: String(doc.title || 'Cover').length,
      coverImageName: file.name || '',
      updatedAt: Date.now()
    };

    await NaviStorage.saveDocument(updated);

    if (currentDocumentId === pendingCoverDocId) {
      await openDocument(pendingCoverDocId);
    }

    await loadDocuments();

    NaviEditor.setSaveStatus('Cover image added');
  } catch (error) {
    console.error('Cover image failed:', error);
    await showAppError(
  error?.message || String(error),
  'Cover image failed'
);
    NaviEditor.setSaveStatus('Cover image error');
  } finally {
    pendingCoverDocId = null;
    event.target.value = '';
  }
}

async function attachExistingPdfAsSubdoc(docId) {
  const source = await NaviStorage.getDocument(docId);

  if (!source) return;

  const parent =
    currentDocumentId
      ? await NaviStorage.getDocument(currentDocumentId)
      : null;

  /*
    We duplicate the existing PDF document instead of moving it.
    Safer: the original stays where it was, and this subdoc gets its own copy.
  */
  const copy =
    NaviStorage.createBlankDocument(source.title || 'Imported PDF');

  copy.docType = 'pdf';
  copy.parentId = currentDocumentId || null;
  copy.folder = parent?.folder || source.folder || '';
  copy.status = getDefaultStatusForDoc(copy);
  copy.content = source.content || '<p></p>';
  copy.plainText = source.plainText || '';
  copy.wordCount = NaviEditor.countWords(copy.plainText);
  copy.charCount = copy.plainText.length;
  copy.importedFrom = source.importedFrom || '';
  copy.importDate = Date.now();

  const saved = await NaviStorage.saveDocument(copy);

  closePdfSubdocModal();

  await loadDocuments();
  await openDocument(saved.id);
}

function getInspectorCollapseKey(title, index) {
  const cleanTitle = String(title || `section-${index}`)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  return `naviwriter-inspector-collapsed:${cleanTitle}`;
}

function setInspectorSectionCollapsed(section, collapsed) {
  section.classList.toggle('collapsed', Boolean(collapsed));

  const chevron = section.querySelector('.inspector-section-chevron');

  if (chevron) {
    chevron.textContent = collapsed ? '▸' : '▾';
  }
}

const INSPECTOR_ACTIVE_TAB_KEY =
  'naviwriter-inspector-active-tab';

function getValidInspectorTab(tab) {
  return ['details', 'review', 'analysis'].includes(tab)
    ? tab
    : 'details';
}

function setInspectorTab(tab = 'details') {
  const activeTab =
    getValidInspectorTab(tab);

  const inspector =
    document.querySelector('.inspector');

  if (inspector) {
    inspector.dataset.activeInspectorTab =
      activeTab;
  }

  document
    .querySelectorAll('[data-inspector-tab-btn]')
    .forEach(button => {
      const isActive =
        button.dataset.inspectorTabBtn === activeTab;

      button.classList.toggle(
        'active',
        isActive
      );

      button.setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );
    });

  document
    .querySelectorAll('.inspector .inspector-section')
    .forEach(section => {
      const sectionTab =
        getValidInspectorTab(
          section.dataset.inspectorTab || 'details'
        );

      const isActive =
        sectionTab === activeTab;

      section.hidden =
        !isActive;

      section.classList.toggle(
        'inspector-tab-hidden',
        !isActive
      );
    });

  try {
    localStorage.setItem(
      INSPECTOR_ACTIVE_TAB_KEY,
      activeTab
    );
  } catch {}
}

function setupInspectorTabs() {
  const savedTab =
    getValidInspectorTab(
      localStorage.getItem(
        INSPECTOR_ACTIVE_TAB_KEY
      )
    );

  document
    .querySelectorAll('[data-inspector-tab-btn]')
    .forEach(button => {
      if (
        button.dataset.inspectorTabReady === 'true'
      ) {
        return;
      }

      button.addEventListener('click', () => {
        setInspectorTab(
          button.dataset.inspectorTabBtn
        );
      });

      button.dataset.inspectorTabReady =
        'true';
    });

  setInspectorTab(savedTab);
}

function placeDocumentMapRefreshInOutlineHeader() {
  const refreshBtn =
    els.refreshDocumentMapBtn ||
    document.getElementById('refreshDocumentMapBtn');

  if (!refreshBtn) {
    return;
  }

  const outlineSection =
    refreshBtn.closest('.inspector-section');

  if (!outlineSection) {
    return;
  }

  outlineSection.classList.add(
    'inspector-outline-section'
  );

  const sectionTitle =
    outlineSection.querySelector(':scope > .section-title');

  if (!sectionTitle) {
    return;
  }

  /*
    If the refresh button is already in the section title,
    don't move it again.
  */
  if (sectionTitle.contains(refreshBtn)) {
    return;
  }

  refreshBtn.classList.add(
    'document-map-refresh-title-btn'
  );

  sectionTitle.appendChild(refreshBtn);
}

function setupCollapsibleInspectorSections() {
  const sections = document.querySelectorAll('.inspector .inspector-section');

  sections.forEach((section, index) => {
    if (section.dataset.collapsibleReady === 'true') {
      return;
    }

    const title = section.querySelector(':scope > .section-title');

    if (!title) return;

    const originalTitle = title.textContent.trim() || `Section ${index + 1}`;
    const storageKey = getInspectorCollapseKey(originalTitle, index);

    const body = document.createElement('div');
    body.className = 'inspector-section-body';

    let node = title.nextSibling;

    while (node) {
      const next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }

    section.appendChild(body);

    title.innerHTML = '';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'inspector-section-toggle';

    toggle.innerHTML = `
      <span>${escapeHtml(originalTitle)}</span>
      <span class="inspector-section-chevron">▾</span>
    `;

    title.appendChild(toggle);

    const savedCollapsed =
      localStorage.getItem(storageKey) === 'true';

    setInspectorSectionCollapsed(section, savedCollapsed);

    toggle.onclick = () => {
      const nextCollapsed =
        !section.classList.contains('collapsed');

      setInspectorSectionCollapsed(section, nextCollapsed);

      try {
        localStorage.setItem(
          storageKey,
          nextCollapsed ? 'true' : 'false'
        );
      } catch {}
    };

    section.dataset.collapsibleReady = 'true';
  });
  
  placeDocumentMapRefreshInOutlineHeader();
  
}

function toggleAllInspectorSections() {
  const sections = Array.from(
  document.querySelectorAll('.inspector .inspector-section')
)
  .filter(section => {
    return !section.hidden;
  });

  if (!sections.length) return;

  const shouldCollapse =
    sections.some(section => !section.classList.contains('collapsed'));

  sections.forEach((section, index) => {
    const titleButton = section.querySelector('.inspector-section-toggle span');
    const title = titleButton?.textContent || `Section ${index + 1}`;
    const storageKey = getInspectorCollapseKey(title, index);

    setInspectorSectionCollapsed(section, shouldCollapse);

    try {
      localStorage.setItem(
        storageKey,
        shouldCollapse ? 'true' : 'false'
      );
    } catch {}
  });

  if (els.toggleInspectorSectionsBtn) {
    els.toggleInspectorSectionsBtn.textContent =
      shouldCollapse ? 'Expand All' : 'Collapse All';
  }
}

function sanitizeHtmlForPrint(html = '') {
  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html || '<p></p>';

  /*
    Imported/editor HTML can sometimes carry inline widths,
    white-space behavior, or layout junk that makes print overflow.
    For compiled PDF/print, we want clean document flow.
  */
  wrapper
    .querySelectorAll('[style]')
    .forEach(node => {
      const tag =
        node.tagName.toLowerCase();

      /*
        Keep image src/alt, but remove sizing styles.
        CSS will handle image sizing in print.
      */
      node.removeAttribute('style');
    });

  wrapper
    .querySelectorAll('[contenteditable]')
    .forEach(node => {
      node.removeAttribute('contenteditable');
    });

  return wrapper.innerHTML;
}

function buildCompiledSectionHtml(doc, options = {}) {
  const includeTitles =
    options.includeTitles !== false;

  const pageBreaks =
    options.pageBreaks !== false;

  const type =
    doc?.docType || 'general';

  const classes = [
    'compiled-section',
    pageBreaks ? 'compiled-page-break' : '',
    `compiled-type-${type}`
  ].filter(Boolean).join(' ');

  const cleanContent =
    sanitizeHtmlForPrint(doc?.content || '<p></p>');

  return `
    <section class="${classes}">
      ${
        includeTitles && type !== 'cover'
          ? `
            <h1 class="compiled-section-title">
              ${escapeHtml(doc.title || 'Untitled Document')}
            </h1>
          `
          : ''
      }

      <div class="compiled-section-body">
        ${cleanContent}
      </div>
    </section>
  `;
}

function injectCompiledTitlePage(compiledDoc, html) {
  const meta =
    compiledDoc.metadata || {};

  const titlePageHtml =
    buildCompiledTitlePageHtml({
      title: meta.title || compiledDoc.title || 'Untitled Project',
      subtitle: meta.subtitle || '',
      author: meta.author || ''
    });

  const text =
    String(html || '');

  const coverMatch =
    text.match(
      /^\s*<section[^>]*compiled-type-cover[^>]*>[\s\S]*?<\/section>\s*/i
    );

  if (coverMatch) {
    return (
      coverMatch[0] +
      titlePageHtml +
      text.slice(coverMatch[0].length)
    );
  }

  return titlePageHtml + text;
}

function buildCompiledTitlePageHtml(metadata = {}) {
  const title =
    metadata.title || metadata.projectTitle || 'Untitled Project';

  const subtitle =
    metadata.subtitle || metadata.projectSubtitle || '';

  const author =
    metadata.author || metadata.projectAuthor || '';

  return `
    <section class="compiled-title-page">
      <div class="compiled-title-inner">
        <h1>${escapeHtml(title)}</h1>

        ${
          subtitle
            ? `<p class="compiled-subtitle">${escapeHtml(subtitle)}</p>`
            : ''
        }

        ${
          author
            ? `<p class="compiled-author">${escapeHtml(author)}</p>`
            : ''
        }
      </div>
    </section>
  `;
}


function buildPrintThemeCss(options = {}) {
  const style =
    options.style || options.printStyle || 'classic';

  const font =
    options.font || 'garamond';

  const margins =
    options.margins || 'standard';

  const pageSize =
    options.pageSize || 'letter';

  const fontFamilyMap = {
    garamond: 'Garamond, Georgia, "Times New Roman", serif',
    georgia: 'Georgia, "Times New Roman", serif',
    times: '"Times New Roman", Times, serif',
    system: 'Arial, Helvetica, sans-serif'
  };

  const marginMap = {
    narrow: '0.55in',
    compact: '0.55in',
    standard: '0.8in',
    wide: '1in'
  };

  const fontFamily =
    fontFamilyMap[font] || fontFamilyMap.garamond;

  const pageMargin =
    marginMap[margins] || marginMap.standard;

  const pageSizeCss =
    pageSize === 'a4'
      ? 'A4'
      : 'Letter';

  const pageOuterWidthCss =
    pageSize === 'a4'
      ? '8.27in'
      : '8.5in';

  const pageOuterHeightCss =
    pageSize === 'a4'
      ? '11.69in'
      : '11in';

  const theme =
    {
      manuscript: {
        fontSize: '12pt',
        lineHeight: '2',
        paragraphIndent: '0.5in',
        textAlign: 'left',
        headingAlign: 'left',
        headingSpacing: '1.25rem'
      },

      classic: {
        fontSize: '11.5pt',
        lineHeight: '1.65',
        paragraphIndent: '1.5em',
        textAlign: 'left',
        headingAlign: 'center',
        headingSpacing: '2.2rem'
      },

      modern: {
        fontSize: '11.5pt',
        lineHeight: '1.58',
        paragraphIndent: '0',
        textAlign: 'left',
        headingAlign: 'left',
        headingSpacing: '1.6rem'
      },

      compact: {
        fontSize: '10.5pt',
        lineHeight: '1.35',
        paragraphIndent: '1em',
        textAlign: 'left',
        headingAlign: 'left',
        headingSpacing: '1rem'
      },

      book: {
        fontSize: '11.5pt',
        lineHeight: '1.65',
        paragraphIndent: '1.5em',
        textAlign: 'left',
        headingAlign: 'center',
        headingSpacing: '2.2rem'
      }
    }[style] || {
      fontSize: '11.5pt',
      lineHeight: '1.6',
      paragraphIndent: '1.25em',
      textAlign: 'left',
      headingAlign: 'left',
      headingSpacing: '1.5rem'
    };

  return `
    @page {
      size: ${pageSizeCss};
      margin: ${pageMargin};
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-width: 0;

      color: #111827;
      font-family: ${fontFamily};
      font-size: ${theme.fontSize};
      line-height: ${theme.lineHeight};
    }

    body {
      background: #4b5563;
      padding: 0.35in 0;
    }

    .compiled-document {
      width: ${pageOuterWidthCss};
      max-width: calc(100vw - 24px);
      min-height: ${pageOuterHeightCss};

      margin: 0 auto;
      padding: ${pageMargin};

      background: #ffffff;
      color: #111827;

      overflow: hidden;

      box-shadow:
        0 0 0 1px #d1d5db,
        0 18px 48px rgba(0, 0, 0, 0.35);
    }

    .compiled-section {
      width: 100%;
      max-width: 100%;
      min-width: 0;

      overflow: visible;

      break-after: page;
      page-break-after: always;
    }

    .compiled-section:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    .compiled-section-title {
      margin: ${theme.headingSpacing} 0 1.25rem;

      text-align: ${theme.headingAlign};

      font-family: ${fontFamily};
      font-size: ${style === 'manuscript' ? '14pt' : '17pt'};
      line-height: 1.2;
      font-weight: 800;

      break-after: avoid;
      page-break-after: avoid;
    }

    .compiled-section-body {
      display: block;

      width: 100%;
      max-width: 100%;
      min-width: 0;

      overflow: visible;
      text-align: ${theme.textAlign};

      white-space: normal;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: normal;
      hyphens: auto;
    }

    .compiled-section-body * {
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    .compiled-section-body p,
    .compiled-section-body div,
    .compiled-section-body li,
    .compiled-section-body blockquote {
      display: block;

      max-width: 100% !important;

      white-space: normal !important;
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
      word-break: normal !important;
    }

    .compiled-section-body span {
      display: inline !important;

      max-width: 100% !important;

      white-space: normal !important;
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
      word-break: normal !important;
    }

    .compiled-section-body p {
      margin: 0 0 0.75rem;

      orphans: 2;
      widows: 2;
    }

    .compiled-section-body p + p {
      text-indent: ${theme.paragraphIndent};
    }

    .compiled-section-body h1,
    .compiled-section-body h2,
    .compiled-section-body h3 {
      break-after: avoid;
      page-break-after: avoid;
      line-height: 1.25;
    }

    .compiled-section-body img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 1rem auto;

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .compiled-section-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .compiled-section-body th,
    .compiled-section-body td {
      border: 1px solid #d1d5db;
      padding: 0.35rem 0.45rem;
      vertical-align: top;
    }

    .compiled-section-body th {
      background: #f3f4f6;
      font-weight: 800;
    }

    .compiled-title-page {
      min-height: 85vh;

      display: grid;
      place-items: center;

      text-align: center;

      break-after: page;
      page-break-after: always;
    }

    .compiled-title-inner {
      display: grid;
      justify-items: center;
      gap: 0.65rem;
    }

    .compiled-title-inner h1 {
      margin: 0;
      font-size: 26pt;
      line-height: 1.15;
      font-weight: 800;
    }

    .compiled-subtitle {
      margin: 0;
      font-size: 14pt;
      color: #4b5563;
    }

    .compiled-author {
      margin-top: 2rem;
      font-size: 12pt;
      font-weight: 700;
    }

    .compiled-cover {
      min-height: 90vh;

      display: grid;
      place-items: center;

      text-align: center;

      break-after: page;
      page-break-after: always;
    }

    .compiled-cover img {
      max-width: min(100%, 520px);
      max-height: 760px;
      object-fit: contain;
    }

    @media print {
      html,
      body {
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .compiled-document {
        width: 100% !important;
        max-width: 100% !important;
        min-height: 0 !important;

        margin: 0 !important;
        padding: 0 !important;

        box-shadow: none !important;
        overflow: visible !important;
      }

      .no-print {
        display: none !important;
      }
    }
  `;
}

function getPrintOptions() {
  return {
    pageSize: els.printPageSizeSelect?.value || 'letter',
    style: els.printStyleSelect?.value || 'book',
    font: els.printFontSelect?.value || 'garamond',
    margins: els.printMarginsSelect?.value || 'standard',
    autoTitlePage: Boolean(els.printAutoTitlePage?.checked)
  };
}

function getPrintPageSizeCss(pageSize) {
  if (pageSize === 'a4') {
    return 'A4';
  }

  return 'Letter';
}

function getPrintMarginCss(margins) {
  if (margins === 'wide') {
    return '1in';
  }

  if (margins === 'compact') {
    return '0.55in';
  }

  return '0.75in';
}

function getPrintFontCss(font) {
  if (font === 'times') {
    return '"Times New Roman", Times, serif';
  }

  if (font === 'georgia') {
    return 'Georgia, "Times New Roman", serif';
  }

  return 'Garamond, Georgia, "Times New Roman", serif';
}

const COMPILE_PROFILES_KEY = 'naviwriter-compile-profiles';

const BOOK_THEMES = {
  classic: {
    name: 'Classic Novel',
    format: 'print',
    printStyle: 'book',
    font: 'garamond',
    margins: 'standard',
    pageSize: 'letter',
    autoTitlePage: true,
    includeCover: true,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  },

  modern: {
    name: 'Modern YA',
    format: 'print',
    printStyle: 'book',
    font: 'georgia',
    margins: 'standard',
    pageSize: 'letter',
    autoTitlePage: true,
    includeCover: true,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  },

  draft: {
    name: 'Draft Review',
    format: 'print',
    printStyle: 'manuscript',
    font: 'times',
    margins: 'wide',
    pageSize: 'letter',
    autoTitlePage: false,
    includeCover: false,
    includeFrontMatter: false,
    includeBodyMatter: true,
    includeBackMatter: false,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  },

  academic: {
    name: 'Academic / Research',
    format: 'print',
    printStyle: 'compact',
    font: 'georgia',
    margins: 'standard',
    pageSize: 'letter',
    autoTitlePage: true,
    includeCover: false,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: true,
    includeResearch: true,
    includePdf: true,
    includeTitles: true,
    pageBreaks: true
  },

  'large-print': {
    name: 'Large Print',
    format: 'print',
    printStyle: 'book',
    font: 'georgia',
    margins: 'wide',
    pageSize: 'letter',
    autoTitlePage: true,
    includeCover: true,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  }
};

const BUILT_IN_COMPILE_PROFILES = [
  {
    id: 'builtin-default-manuscript',
    builtIn: true,
    name: 'Default Manuscript',
    theme: 'classic',
    format: 'print',
    pageSize: 'letter',
    printStyle: 'book',
    font: 'garamond',
    margins: 'standard',
    autoTitlePage: true,
    includeCover: true,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  },
  {
    id: 'builtin-beta-reader-draft',
    builtIn: true,
    name: 'Beta Reader Draft',
    theme: 'draft',
    format: 'print',
    pageSize: 'letter',
    printStyle: 'manuscript',
    font: 'times',
    margins: 'wide',
    autoTitlePage: false,
    includeCover: false,
    includeFrontMatter: false,
    includeBodyMatter: true,
    includeBackMatter: false,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  },
  {
    id: 'builtin-full-archive',
    builtIn: true,
    name: 'Full Archive',
    theme: 'academic',
    format: 'html',
    pageSize: 'letter',
    printStyle: 'compact',
    font: 'georgia',
    margins: 'standard',
    autoTitlePage: true,
    includeCover: true,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: true,
    includeResearch: true,
    includePdf: true,
    includeTitles: true,
    pageBreaks: true
  },
  {
    id: 'builtin-modern-ya',
    builtIn: true,
    name: 'Modern YA PDF',
    theme: 'modern',
    format: 'print',
    pageSize: 'letter',
    printStyle: 'book',
    font: 'georgia',
    margins: 'standard',
    autoTitlePage: true,
    includeCover: true,
    includeFrontMatter: true,
    includeBodyMatter: true,
    includeBackMatter: true,
    includeNotes: false,
    includeResearch: false,
    includePdf: false,
    includeTitles: true,
    pageBreaks: true
  }
];

async function getUserCompileProfiles() {
  const saved =
    await NaviStorage.getSetting(COMPILE_PROFILES_KEY, []);

  return Array.isArray(saved)
    ? saved
    : [];
}

async function saveUserCompileProfiles(profiles) {
  await NaviStorage.saveSetting(
    COMPILE_PROFILES_KEY,
    Array.isArray(profiles) ? profiles : []
  );
}

async function getAllCompileProfiles() {
  const userProfiles =
    await getUserCompileProfiles();

  return [
    ...BUILT_IN_COMPILE_PROFILES,
    ...userProfiles
  ];
}

async function populateCompileProfileSelect() {
  if (!els.compileProfileSelect) return;

  const profiles =
    await getAllCompileProfiles();

  els.compileProfileSelect.innerHTML =
  '<option value="">Custom / Unsaved</option>';

  profiles.forEach(profile => {
    const option =
      document.createElement('option');

    option.value = profile.id;
    option.textContent = profile.builtIn
      ? `${profile.name}`
      : profile.name;

    els.compileProfileSelect.appendChild(option);
  });
}

function getCurrentCompileProfileSnapshot(name = 'Untitled Profile') {
  const compileOptions =
    getCompileOptions();

  const printOptions =
    getPrintOptions();

  return {
    id: `profile-${Date.now()}`,
    builtIn: false,
    name,
    theme: els.bookThemeSelect?.value || 'classic',

    format: compileOptions.format,
    includeTitles: compileOptions.includeTitles,
    pageBreaks: compileOptions.pageBreaks,
    includeCover: compileOptions.includeCover,
    includeFrontMatter: compileOptions.includeFrontMatter,
    includeBodyMatter: compileOptions.includeBodyMatter,
    includeBackMatter: compileOptions.includeBackMatter,
    includeNotes: compileOptions.includeNotes,
    includeResearch: compileOptions.includeResearch,
    includePdf: compileOptions.includePdf,

    pageSize: printOptions.pageSize,
    printStyle: printOptions.style,
    font: printOptions.font,
    margins: printOptions.margins,
    autoTitlePage: printOptions.autoTitlePage,

    updatedAt: Date.now()
  };
}

function setChecked(el, value) {
  if (el) {
    el.checked = Boolean(value);
  }
}

function setValue(el, value) {
  if (el && value !== undefined && value !== null) {
    el.value = value;
  }
}

function applyCompileProfileToControls(profile) {
  if (!profile) return;

  setValue(els.bookThemeSelect, profile.theme || 'classic');

  setValue(els.compileFormatSelect, profile.format || 'html');

  setChecked(els.compileIncludeTitles, profile.includeTitles);
  setChecked(els.compilePageBreaks, profile.pageBreaks);
  setChecked(els.compileIncludeCover, profile.includeCover);
  setChecked(els.compileIncludeFrontMatter, profile.includeFrontMatter);
  setChecked(els.compileIncludeBodyMatter, profile.includeBodyMatter);
  setChecked(els.compileIncludeBackMatter, profile.includeBackMatter);
  setChecked(els.compileIncludeNotes, profile.includeNotes);
  setChecked(els.compileIncludeResearch, profile.includeResearch);
  setChecked(els.compileIncludePdf, profile.includePdf);

  setValue(els.printPageSizeSelect, profile.pageSize || 'letter');
  setValue(els.printStyleSelect, profile.printStyle || 'book');
  setValue(els.printFontSelect, profile.font || 'garamond');
  setValue(els.printMarginsSelect, profile.margins || 'standard');
  setChecked(els.printAutoTitlePage, profile.autoTitlePage);

  renderCompilePreview();
}

function applyBookTheme(themeKey) {
  const theme =
    BOOK_THEMES[themeKey];

  if (!theme) return;

  const profileLike = {
    theme: themeKey,
    format: theme.format,
    pageSize: theme.pageSize,
    printStyle: theme.printStyle,
    font: theme.font,
    margins: theme.margins,
    autoTitlePage: theme.autoTitlePage,
    includeCover: theme.includeCover,
    includeFrontMatter: theme.includeFrontMatter,
    includeBodyMatter: theme.includeBodyMatter,
    includeBackMatter: theme.includeBackMatter,
    includeNotes: theme.includeNotes,
    includeResearch: theme.includeResearch,
    includePdf: theme.includePdf,
    includeTitles: theme.includeTitles,
    pageBreaks: theme.pageBreaks
  };

  applyCompileProfileToControls(profileLike);

  if (els.compileProfileSelect) {
    els.compileProfileSelect.value = '';
  }

  NaviEditor.setSaveStatus(`Theme applied: ${theme.name}`);
}

async function applySelectedCompileProfile() {
  const profileId =
    els.compileProfileSelect?.value || '';

  if (!profileId) {
    showAppNotice(
      'Choose a compile profile first.',
      'No profile selected'
    );
    return;
  }

  const profiles =
    await getAllCompileProfiles();

  const profile =
    profiles.find(item => item.id === profileId);

  if (!profile) {
    showAppNotice(
      'That compile profile could not be found.',
      'Profile missing'
    );
    return;
  }

  applyCompileProfileToControls(profile);
  NaviEditor.setSaveStatus(`Profile applied: ${profile.name}`);
}

async function saveCurrentCompileProfile() {
  const name =
    await openTextInputModal({
      title: 'Save Compile Profile',
      message: 'Name this export setup.',
      label: 'Profile name',
      defaultValue: 'New Compile Profile',
      placeholder: 'Beta Reader Draft',
      submitText: 'Save Profile'
    });

  if (!name || !name.trim()) return;

  const userProfiles =
    await getUserCompileProfiles();

  const cleanName =
    name.trim();

  const existingIndex =
    userProfiles.findIndex(profile => {
      return profile.name.toLowerCase() === cleanName.toLowerCase();
    });

  const nextProfile =
    getCurrentCompileProfileSnapshot(cleanName);

  if (existingIndex >= 0) {
    const ok =
      await openConfirmModal({
        title: 'Replace Profile?',
        message: `A profile named "${cleanName}" already exists. Replace it?`,
        confirmText: 'Replace',
        cancelText: 'Cancel',
        danger: false
      });

    if (!ok) return;

    nextProfile.id = userProfiles[existingIndex].id;
    userProfiles[existingIndex] = nextProfile;
  } else {
    userProfiles.push(nextProfile);
  }

  await saveUserCompileProfiles(userProfiles);
  await populateCompileProfileSelect();

  if (els.compileProfileSelect) {
    els.compileProfileSelect.value = nextProfile.id;
  }

  NaviEditor.setSaveStatus(`Profile saved: ${cleanName}`);
}

async function deleteSelectedCompileProfile() {
  const profileId =
    els.compileProfileSelect?.value || '';

  if (!profileId) {
    showAppNotice(
      'Choose a saved user profile first.',
      'No profile selected'
    );
    return;
  }

  const allProfiles =
    await getAllCompileProfiles();

  const selected =
    allProfiles.find(profile => profile.id === profileId);

  if (!selected) {
    showAppNotice(
      'That compile profile could not be found.',
      'Profile missing'
    );
    return;
  }

  if (selected.builtIn) {
    showAppNotice(
      'Built-in profiles cannot be deleted. Save your own copy if you want a custom version.',
      'Built-in profile'
    );
    return;
  }

  const ok =
    await openConfirmModal({
      title: 'Delete Compile Profile',
      message: `Delete "${selected.name}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true
    });

  if (!ok) return;

  const userProfiles =
    await getUserCompileProfiles();

  const nextProfiles =
    userProfiles.filter(profile => profile.id !== profileId);

  await saveUserCompileProfiles(nextProfiles);
  await populateCompileProfileSelect();

  if (els.compileProfileSelect) {
    els.compileProfileSelect.value = '';
  }

  NaviEditor.setSaveStatus(`Profile deleted: ${selected.name}`);
}

function compiledHasTitlePage(compiledDoc) {
  return Boolean(
    compiledDoc?.compiledFrom?.some(item => {
      const title = String(item.title || '').toLowerCase();
      const type = item.docType || '';

      return (
        type === 'front-matter' &&
        (
          title.includes('title page') ||
          title === 'title' ||
          title.includes('book title')
        )
      );
    })
  );
}

function buildAutoTitlePageHtml(compiledDoc) {
  const meta = compiledDoc.metadata || {};

  const title =
    meta.title ||
    compiledDoc.title ||
    'Untitled Book';

  const subtitle =
    meta.subtitle || '';

  const author =
    meta.author || '';

  return `
    <section class="print-auto-title-page">
      <div>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="print-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        ${author ? `<p class="print-author">${escapeHtml(author)}</p>` : ''}
      </div>
    </section>
  `;
}

function injectAutoTitlePage(compiledDoc, html) {
  const titlePageHtml =
    buildAutoTitlePageHtml(compiledDoc);

  /*
    If a cover exists first, place the auto title page after the cover.
    Otherwise, place it at the start.
  */
  const coverMatch =
    String(html || '').match(
      /^\s*<section class="compiled-cover">[\s\S]*?<\/section>\s*(?:<div[^>]*><\/div>\s*)?/i
    );

  if (coverMatch) {
    return (
      coverMatch[0] +
      titlePageHtml +
      String(html || '').slice(coverMatch[0].length)
    );
  }

  return titlePageHtml + html;
}

function getCompileScope() {
  const selected =
    document.querySelector('input[name="compileScope"]:checked');

  return selected?.value || 'current';
}

function getCompileOptions() {
  return {
    scope: getCompileScope(),
    format: els.compileFormatSelect?.value || 'html',
    includeTitles: Boolean(els.compileIncludeTitles?.checked),
    pageBreaks: Boolean(els.compilePageBreaks?.checked),
    includeCover: Boolean(els.compileIncludeCover?.checked),
    includeFrontMatter: Boolean(els.compileIncludeFrontMatter?.checked),
    includeBodyMatter: Boolean(els.compileIncludeBodyMatter?.checked),
    includeBackMatter: Boolean(els.compileIncludeBackMatter?.checked),
    includeNotes: Boolean(els.compileIncludeNotes?.checked),
    includeResearch: Boolean(els.compileIncludeResearch?.checked),
    includePdf: Boolean(els.compileIncludePdf?.checked)
  };
}

function getCompileMatterRank(doc) {
  const type = doc?.docType || 'general';

  if (type === 'cover') return -1;
  if (type === 'front-matter') return 0;

  if (type === 'manuscript') return 1;
  if (type === 'body-matter') return 2;
  if (type === 'chapter') return 2;
  if (type === 'general') return 2;

  if (type === 'notes') return 3;
  if (type === 'research') return 3;
  if (type === 'pdf') return 3;

  if (type === 'back-matter') return 4;

  return 3;
}

function sortDocsForCompile(docs) {
  return docs.slice().sort((a, b) => {
    const rankA = getCompileMatterRank(a);
    const rankB = getCompileMatterRank(b);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const orderA = Number.isFinite(Number(a.sortOrder))
      ? Number(a.sortOrder)
      : null;

    const orderB = Number.isFinite(Number(b.sortOrder))
      ? Number(b.sortOrder)
      : null;

    if (orderA !== null && orderB !== null) {
      return orderA - orderB;
    }

    const chapterA = getChapterNumberFromTitle(a.title);
    const chapterB = getChapterNumberFromTitle(b.title);

    if (chapterA !== null && chapterB !== null) {
      return chapterA - chapterB;
    }

    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function shouldIncludeDocInCompile(doc, options) {
  const type = doc?.docType || 'general';

  if (type === 'cover' && !options.includeCover) {
    return false;
  }

  if (type === 'front-matter' && !options.includeFrontMatter) {
    return false;
  }

  if (
    (
      type === 'manuscript' ||
      type === 'chapter' ||
      type === 'body-matter' ||
      type === 'general'
    ) &&
    !options.includeBodyMatter
  ) {
    return false;
  }

  if (type === 'back-matter' && !options.includeBackMatter) {
    return false;
  }

  if (type === 'notes' && !options.includeNotes) {
    return false;
  }

  if (type === 'research' && !options.includeResearch) {
    return false;
  }

  if (type === 'pdf' && !options.includePdf) {
    return false;
  }

  return true;
}

function compilePageBreakHtml() {
  return '<div style="break-after: page; page-break-after: always;"></div>';
}

function compileDocTitleHtml(doc) {
  const title = doc?.title || 'Untitled Document';

  return `<h1>${escapeHtml(title)}</h1>`;
}

function compileDocHtml(doc, options, index, total) {
  const parts = [];

  const type = doc?.docType || 'general';

  if (type === 'cover') {
    parts.push(`
      <section class="compiled-cover">
        ${getExportSafeDocumentContent(doc)}
      </section>
    `);

    if (options.pageBreaks && index < total - 1) {
      parts.push(compilePageBreakHtml());
    }

    return parts.join('\n');
  }

  if (type === 'front-matter') {
    parts.push(`
      <section class="compiled-front-matter">
        ${getExportSafeDocumentContent(doc)}
      </section>
    `);

    if (options.pageBreaks && index < total - 1) {
      parts.push(compilePageBreakHtml());
    }

    return parts.join('\n');
  }

  if (type === 'back-matter') {
    parts.push(`
      <section class="compiled-back-matter">
        ${getExportSafeDocumentContent(doc)}
      </section>
    `);

    if (options.pageBreaks && index < total - 1) {
      parts.push(compilePageBreakHtml());
    }

    return parts.join('\n');
  }

  const shouldAutoTitle =
    options.includeTitles &&
    type !== 'front-matter' &&
    type !== 'back-matter' &&
    type !== 'cover';

  parts.push('<section class="compiled-body-matter">');

  if (shouldAutoTitle) {
    parts.push(compileDocTitleHtml(doc));
  }

  parts.push(getExportSafeDocumentContent(doc));
  parts.push('</section>');

  if (options.pageBreaks && index < total - 1) {
    parts.push(compilePageBreakHtml());
  }

  return parts.join('\n');
}

function htmlToPlainTextForCompile(html = '') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';

  return wrapper.innerText || wrapper.textContent || '';
}

function htmlToMarkdownForCompile(html = '') {
  if (window.NaviExport?.htmlToMarkdown) {
    return NaviExport.htmlToMarkdown(html);
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';

  return wrapper.innerText || wrapper.textContent || '';
}

async function getCompileDocuments(options) {
  if (!currentDocumentId) {
    return [];
  }

  await saveCurrentDocument({
    manual: true
  });

  const current = await NaviStorage.getDocument(currentDocumentId);

  if (!current) {
    return [];
  }

  if (options.scope === 'current') {
    return [current].filter(doc => shouldIncludeDocInCompile(doc, options));
  }

  const rootId = await getProjectRootDocumentId(currentDocumentId);

  if (!rootId) {
    return [current].filter(doc => shouldIncludeDocInCompile(doc, options));
  }

  const rootDoc = await NaviStorage.getDocument(rootId);

  if (!rootDoc) {
    return [current].filter(doc => shouldIncludeDocInCompile(doc, options));
  }

  let docs = [];

  if (rootDoc.docType === 'manuscript') {
    docs = await getOrderedManuscriptDocs(rootDoc);
  } else {
    docs = await getProjectDocuments(rootId);
  }

  return sortDocsForCompile(
  docs.filter(doc => shouldIncludeDocInCompile(doc, options))
);
  
}


async function buildCompiledDocument(options) {
  const docs =
    await getCompileDocuments(options);

  const metadata =
    await getProjectMetadata();

  if (!docs.length) {
    throw new Error('No documents matched the compile options.');
  }

  const title =
    options.scope === 'current'
      ? docs[0].title || 'Compiled Document'
      : metadata.title || `${docs[0].title || 'Project'} Compile`;

  const html =
    docs
      .map(doc => {
        return buildCompiledSectionHtml(doc, {
          includeTitles: options.includeTitles,
          pageBreaks: options.pageBreaks
        });
      })
      .join('\n');

  const plainText =
    htmlToPlainTextForCompile(html);

  return {
    id: `compile-${Date.now()}`,
    title,
    docType: 'compiled',
    content: html,
    plainText,
    wordCount: NaviEditor.countWords(plainText),
    charCount: plainText.length,
    metadata,
    compiledFrom: docs.map(doc => ({
      id: doc.id,
      title: doc.title || 'Untitled Document',
      docType: doc.docType || 'general'
    }))
  };
}
  
  function getReadableDocType(doc) {
  const type = doc?.docType || 'doc';

  if (type === 'cover') return 'Cover';
  if (type === 'manuscript') return 'Manuscript';
  if (type === 'chapter') return 'Chapter';
  if (type === 'body-matter') return 'Body Matter';
  if (type === 'front-matter') return 'Front Matter';
  if (type === 'back-matter') return 'Back Matter';
  if (type === 'notes') return 'Notes';
  if (type === 'research') return 'Research';
  if (type === 'pdf') return 'PDF';
  if (type === 'general') return 'General';

  return 'Doc';
}

function stripInlineCommentMarksFromElement(root) {
  if (!root) {
    return;
  }

  root
    .querySelectorAll('[data-inline-comment-id], .inline-comment-mark')
    .forEach(mark => {
      const parent =
        mark.parentNode;

      if (!parent) {
        return;
      }

      while (mark.firstChild) {
        parent.insertBefore(
          mark.firstChild,
          mark
        );
      }

      mark.remove();
    });
}

function getExportSafeHtml(html = '') {
  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html || '';

  stripInlineCommentMarksFromElement(wrapper);

  /*
    Defensive cleanup in case any class/data survives on nested elements.
  */
  wrapper
    .querySelectorAll('[data-inline-comment-id]')
    .forEach(node => {
      node.removeAttribute('data-inline-comment-id');
    });

  wrapper
    .querySelectorAll('.inline-comment-mark, .inline-comment-jump-highlight')
    .forEach(node => {
      node.classList.remove(
        'inline-comment-mark',
        'inline-comment-jump-highlight'
      );
    });

  return wrapper.innerHTML;
}

function getExportSafeDocumentContent(doc) {
  return getExportSafeHtml(
    doc?.content || '<p></p>'
  );
}

function getExportSafeCurrentEditorHtml() {
  return getExportSafeHtml(
    getExportSafeCurrentEditorHtml()
  );
}

async function renderCompilePreview() {
  if (!els.compilePreviewList) return;

  const options = getCompileOptions();

  try {
    const docs = await getCompileDocuments(options);

    if (!docs.length) {
      els.compilePreviewList.innerHTML =
        '<div class="empty-note">No documents matched these options.</div>';
      return;
    }

    els.compilePreviewList.innerHTML = '';

    docs.forEach((doc, index) => {
      const item = document.createElement('div');
      item.className = 'compile-preview-item';

      const words = Number(doc.wordCount || 0);

      item.innerHTML = `
        <div class="compile-preview-title">
          ${index + 1}. ${escapeHtml(doc.title || 'Untitled Document')}
        </div>
        <div class="compile-preview-meta">
          ${escapeHtml(getReadableDocType(doc))} • ${words} ${words === 1 ? 'word' : 'words'}
        </div>
      `;

      els.compilePreviewList.appendChild(item);
    });
  } catch (error) {
    console.error('Compile preview failed:', error);

    els.compilePreviewList.innerHTML =
      '<div class="empty-note">Could not build preview.</div>';
  }
}

async function openCompileModal() {
  if (!els.compileModal) return;

  els.compileModal.classList.remove('hidden');

  await loadProjectMetadataFields();
  await populateCompileProfileSelect();

  wireCompileOptionPreviewEvents();
  renderCompilePreview();
}

function closeCompileModal() {
  if (!els.compileModal) return;

  els.compileModal.classList.add('hidden');
}

function downloadCompiledTextFile(compiledDoc, extension, type, content) {
  const blob = new Blob([content], {
    type
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${safeFileName(compiledDoc.title)}.${extension}`;
  link.click();

  URL.revokeObjectURL(url);
}

function buildCompiledPrintCss({
  pageSize = 'Letter',
  margin = '0.75in',
  fontFamily = 'Garamond, Georgia, "Times New Roman", serif',
  style = 'book'
} = {}) {
  const isManuscript =
    style === 'manuscript';

  const isCompact =
    style === 'compact';

  const baseFontSize =
    isManuscript ? '12pt' : isCompact ? '10.8pt' : '11.5pt';

  const lineHeight =
    isManuscript ? '2' : isCompact ? '1.45' : '1.62';

  const paragraphIndent =
    isManuscript ? '0.5in' : '1.35em';

  const paragraphSpacing =
    isManuscript ? '0' : '0.15em';

  return `
    @page {
      size: ${pageSize};
      margin: ${margin};
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
    }

    body {
      font-family: ${fontFamily};
      font-size: ${baseFontSize};
      line-height: ${lineHeight};
    }

    .print-document {
      width: 100%;
      margin: 0 auto;
    }

    h1,
    h2,
    h3 {
      font-family: ${isManuscript
        ? 'Arial, Helvetica, sans-serif'
        : fontFamily};
      line-height: 1.22;
      break-after: avoid;
      page-break-after: avoid;
      color: #111827;
    }

    h1 {
      text-align: center;
      font-size: ${isManuscript ? '16pt' : '20pt'};
      margin: ${isManuscript ? '0 0 0.35in' : '0 0 0.45in'};
      font-weight: ${isManuscript ? '700' : '600'};
      letter-spacing: ${isManuscript ? '0' : '0.02em'};
    }

    h2 {
      font-size: ${isManuscript ? '14pt' : '15pt'};
      margin: 0.28in 0 0.16in;
    }

    h3 {
      font-size: ${isManuscript ? '12.5pt' : '13pt'};
      margin: 0.22in 0 0.12in;
    }

    p {
      margin: 0 0 ${paragraphSpacing};
      text-align: ${isManuscript ? 'left' : 'justify'};
      hyphens: auto;
      orphans: 2;
      widows: 2;
    }

    .compiled-body-matter p + p,
    .compiled-front-matter p + p,
    .compiled-back-matter p + p {
      text-indent: ${paragraphIndent};
    }

    h1 + p,
    h2 + p,
    h3 + p,
    blockquote + p,
    figure + p,
    table + p,
    ul + p,
    ol + p {
      text-indent: 0 !important;
    }

    .compiled-cover,
    .print-auto-title-page,
    .title-page {
      min-height: 90vh;
      display: grid;
      place-items: center;
      text-align: center;
      break-after: page;
      page-break-after: always;
    }

    .print-auto-title-page h1,
    .title-page h1 {
      font-size: ${isManuscript ? '20pt' : '28pt'};
      margin-bottom: 0.2in;
      letter-spacing: 0.03em;
    }

    .print-subtitle,
    .book-subtitle {
      font-size: ${isManuscript ? '13pt' : '15pt'};
      color: #374151;
      margin-top: 0;
      text-align: center;
      text-indent: 0 !important;
    }

    .print-author,
    .book-author {
      margin-top: 0.55in;
      font-size: ${isManuscript ? '12pt' : '13.5pt'};
      font-weight: 600;
      text-align: center;
      text-indent: 0 !important;
    }

    .compiled-cover figure,
    .cover-page {
      margin: 0;
      display: grid;
      justify-items: center;
      gap: 0.18in;
    }

    .compiled-cover img,
    .cover-page img {
      max-width: 100%;
      max-height: 8.6in;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }

    .compiled-cover figcaption,
    .cover-page figcaption {
      font-size: 9pt;
      color: #6b7280;
      text-align: center;
    }

    .compiled-front-matter,
    .compiled-body-matter,
    .compiled-back-matter {
      break-after: page;
      page-break-after: always;
    }

    .compiled-front-matter h1,
    .compiled-back-matter h1 {
      margin-top: 0;
    }

    blockquote {
      margin: 0.25in 0;
      padding-left: 0.18in;
      border-left: 3px solid #d1d5db;
      color: #374151;
      font-style: italic;
    }

    blockquote p {
      text-indent: 0 !important;
      text-align: left;
    }

    ul,
    ol {
      margin-top: 0.12in;
      margin-bottom: 0.18in;
      padding-left: 0.3in;
    }

    li {
      margin-bottom: 0.04in;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.22in 0;
      break-inside: avoid;
      page-break-inside: avoid;
      font-size: 10pt;
    }

    th,
    td {
      border: 1px solid #9ca3af;
      padding: 6px 8px;
      vertical-align: top;
    }

    th {
      background: #f3f4f6;
      font-weight: 700;
    }

    img {
      max-width: 100%;
      height: auto;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    figure {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    hr {
      border: 0;
      border-top: 1px solid #d1d5db;
      margin: 0.3in auto;
      width: 40%;
    }

    .endnotes {
      break-before: page;
      page-break-before: always;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .compiled-cover,
      .print-auto-title-page,
      .title-page {
        min-height: calc(100vh - 1in);
      }
    }
  `;
}

async function printCompiledDocument(compiledDoc) {
  const printOptions =
    getPrintOptions();

  const printWindow =
    window.open('', '_blank');

  if (!printWindow) {
    showAppNotice(
      'Popup blocked. Allow popups to print compiled document.'
    );
    return;
  }

  let printContent =
    compiledDoc.content || '';

  if (
    printOptions.autoTitlePage &&
    !compiledHasTitlePage(compiledDoc)
  ) {
    printContent =
      injectCompiledTitlePage(compiledDoc, printContent);
  }

  const printCss =
    buildPrintThemeCss(printOptions);

  printWindow.document.open();

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />

        <title>${escapeHtml(compiledDoc.title || 'NaviWriter Print')}</title>

        <style>
          ${printCss}
        </style>
      </head>

      <body>
        <main class="compiled-document">
          ${printContent}
        </main>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 120);
}

async function runCompileExport() {
  const options = getCompileOptions();

  try {
    const compiledDoc = await buildCompiledDocument(options);

    if (options.format === 'html') {
      if (window.NaviExport?.exportHtml) {
        NaviExport.exportHtml(compiledDoc);
      } else {
        downloadCompiledTextFile(
          compiledDoc,
          'html',
          'text/html',
          compiledDoc.content || ''
        );
      }

      NaviEditor.setSaveStatus('Compiled HTML exported');
      return;
    }

    if (options.format === 'txt') {
      if (window.NaviExport?.exportTxt) {
        NaviExport.exportTxt(compiledDoc);
      } else {
        downloadCompiledTextFile(
          compiledDoc,
          'txt',
          'text/plain',
          compiledDoc.plainText || ''
        );
      }

      NaviEditor.setSaveStatus('Compiled TXT exported');
      return;
    }

    if (options.format === 'markdown') {
      const markdown =
        window.NaviExport?.htmlToMarkdown
          ? NaviExport.htmlToMarkdown(compiledDoc.content || '')
          : htmlToMarkdownForCompile(compiledDoc.content || '');

      downloadCompiledTextFile(
        compiledDoc,
        'md',
        'text/markdown',
        markdown
      );

      NaviEditor.setSaveStatus('Compiled Markdown exported');
      return;
    }

    if (options.format === 'docx') {
      if (!window.NaviExport?.exportDocx) {
        showAppNotice('DOCX export is not available.');
        return;
      }

      await NaviExport.exportDocx(compiledDoc);
      NaviEditor.setSaveStatus('Compiled DOCX exported');
      return;
    }

    if (options.format === 'print') {
  await printCompiledDocument(compiledDoc);
  NaviEditor.setSaveStatus('Compiled print view opened');
  return;
}
  } catch (error) {
    console.error('Compile failed:', error);
    await showAppError(
  error?.message || String(error),
  'Compile failed'
);
    NaviEditor.setSaveStatus('Compile error');
  }
}

function isMatterPresetType(type) {
  return (
    type === 'front-matter' ||
    type === 'body-matter' ||
    type === 'back-matter'
  );
}

function getSelectedBoardItems() {
  return currentBoardData.items.filter(item => {
    return selectedBoardItemIds.has(item.id);
  });
}

function getSelectedBoardItem() {
  return getSelectedBoardItems()[0] || null;
}

function getNextBoardZIndex() {
  return currentBoardData.items.reduce((max, item) => {
    return Math.max(max, Number(item.zIndex || 2));
  }, 2) + 1;
}

function getLowestBoardZIndex() {
  return currentBoardData.items.reduce((min, item) => {
    return Math.min(min, Number(item.zIndex || 2));
  }, 2) - 1;
}

function duplicateSelectedBoardItem() {
  const selectedItems = getSelectedBoardItems();

  if (!selectedItems.length) {
    showAppNotice(
      'Select one or more board cards first.',
      'No card selected'
    );
    return;
  }

  pushBoardUndoState();

  const selectedIds =
    new Set(selectedItems.map(item => item.id));

  const idMap =
    new Map();

  const duplicates = [];
  let nextZ = getNextBoardZIndex();

  selectedItems.forEach(selected => {
    const nextId =
      crypto.randomUUID();

    idMap.set(selected.id, nextId);

    const duplicate = {
      ...JSON.parse(JSON.stringify(selected)),
      id: nextId,
      x: Number(selected.x || 0) + 28,
      y: Number(selected.y || 0) + 28,
      zIndex: nextZ
    };

    nextZ += 1;
    duplicates.push(duplicate);
  });

  const duplicatedConnectors =
    currentBoardData.connectors
      .filter(connector => {
        return (
          selectedIds.has(connector.fromId) &&
          selectedIds.has(connector.toId)
        );
      })
      .map(connector => {
        return {
          ...JSON.parse(JSON.stringify(connector)),
          id: crypto.randomUUID(),
          fromId: idMap.get(connector.fromId),
          toId: idMap.get(connector.toId)
        };
      });

  currentBoardData.items.push(...duplicates);
  currentBoardData.connectors.push(...duplicatedConnectors);

  selectedBoardItemIds =
    new Set(duplicates.map(item => item.id));

  activeBoardItemId =
    duplicates[0]?.id || null;

  renderBoard();
  scheduleAutosave();
}

function bringSelectedBoardItemToFront() {
  const selectedItems = getSelectedBoardItems();

  if (!selectedItems.length) {
    showAppNotice(
      'Select one or more board cards first.',
      'No card selected'
    );
    return;
  }

  pushBoardUndoState();

  let zIndex = getNextBoardZIndex();

  selectedItems.forEach(item => {
    item.zIndex = zIndex;
    zIndex += 1;
  });

  renderBoard();
  scheduleAutosave();
}

function sendSelectedBoardItemToBack() {
  const selectedItems = getSelectedBoardItems();

  if (!selectedItems.length) {
    showAppNotice(
      'Select one or more board cards first.',
      'No card selected'
    );
    return;
  }

  pushBoardUndoState();

  let zIndex = getLowestBoardZIndex();

  selectedItems.forEach(item => {
    item.zIndex = zIndex;
    zIndex -= 1;
  });

  renderBoard();
  scheduleAutosave();
}

function adjustSelectedBoardFontSize(delta) {
  const selectedItems = getSelectedBoardItems();

  if (!selectedItems.length) {
    showAppNotice(
      'Select one or more board cards first.',
      'No card selected'
    );
    return;
  }

  pushBoardUndoState();

  selectedItems.forEach(item => {
    const current =
      Number(item.fontSize || 13);

    item.fontSize =
      Math.max(9, Math.min(24, current + delta));
  });

  renderBoard();
  scheduleAutosave();
}

function resetSelectedBoardFontSize() {
  const selectedItems = getSelectedBoardItems();

  if (!selectedItems.length) {
    showAppNotice(
      'Select one or more board cards first.',
      'No card selected'
    );
    return;
  }

  pushBoardUndoState();

  selectedItems.forEach(item => {
    item.fontSize = 13;
  });

  renderBoard();
  scheduleAutosave();
}

function resetBoardZoom() {
  setBoardZoom(1);
}

function wireCompileOptionPreviewEvents() {
  document
    .querySelectorAll(
      [
        'input[name="compileScope"]',
        '#compileIncludeTitles',
        '#compilePageBreaks',
        '#compileIncludeFrontMatter',
        '#compileIncludeBackMatter',
        '#compileIncludeNotes',
        '#compileIncludeResearch',
        '#compileIncludeCover',
'#compileIncludeBodyMatter',
        '#compileIncludePdf'
      ].join(', ')
    )
    .forEach(control => {
      control.onchange = renderCompilePreview;
    });

  if (els.compileFormatSelect) {
    els.compileFormatSelect.onchange = renderCompilePreview;
  }
}

function syncOutlinerViewModeClass() {
  const view =
    els.outlinerViewSelect?.value || 'table';

  const isRelationshipView =
    view === 'relationships';

  const modalShell =
    els.outlinerModal;

  const modalPanel =
    els.outlinerModal?.querySelector('.outliner-modal');

  [modalShell, modalPanel]
    .filter(Boolean)
    .forEach(node => {
      node.classList.toggle(
        'relationship-view',
        isRelationshipView
      );

      node.classList.toggle(
        'table-view',
        !isRelationshipView
      );
    });
}

function closeTopMenus(exceptMenu = null) {
  document
    .querySelectorAll('.top-menu[open]')
    .forEach(menu => {
      if (menu !== exceptMenu) {
        menu.removeAttribute('open');
      }
    });
}

function setupTopMenus() {
  const menus =
    Array.from(
      document.querySelectorAll('.top-menu')
    );

  if (!menus.length) {
    return;
  }

  menus.forEach(menu => {
    if (menu.dataset.topMenuReady === 'true') {
      return;
    }

    menu.addEventListener('toggle', () => {
      if (menu.open) {
        closeTopMenus(menu);
      }
    });

    menu
      .querySelectorAll('.top-menu-panel button')
      .forEach(button => {
        button.addEventListener('click', () => {
          menu.removeAttribute('open');
        });
      });

    menu.dataset.topMenuReady = 'true';
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.top-actions-clean')) {
      closeTopMenus();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeTopMenus();
    }
  });
}

function closeBoardMoreMenu() {
  document
    .querySelectorAll('.board-more-menu[open]')
    .forEach(menu => {
      menu.removeAttribute('open');
    });
}

function getLayoutPreference() {
  try {
    return localStorage.getItem(
      LAYOUT_MODE_KEY
    ) || 'auto';
  } catch {
    return 'auto';
  }
}

function saveLayoutPreference(mode = 'auto') {
  currentLayoutPreference =
    ['auto', 'desktop', 'compact', 'mobile'].includes(mode)
      ? mode
      : 'auto';

  try {
    localStorage.setItem(
      LAYOUT_MODE_KEY,
      currentLayoutPreference
    );
  } catch {}
}

function getAutoLayoutMode() {
  const width =
    window.innerWidth || 1400;

  if (width < 720) {
    return 'mobile';
  }

  if (width < 1180) {
    return 'compact';
  }

  return 'desktop';
}

function resolveLayoutMode() {
  const preference =
    currentLayoutPreference || 'auto';

  if (preference === 'auto') {
    return getAutoLayoutMode();
  }

  return preference;
}

function closeResponsiveDrawers() {
  closeTopMenus();
  closeBoardMoreMenu();

  document.body.classList.remove(
    'sidebar-drawer-open',
    'inspector-drawer-open'
  );

  if (els.responsiveOverlay) {
    els.responsiveOverlay.classList.add(
      'hidden'
    );
  }
}

function openSidebarDrawer() {
  closeTopMenus();
  closeBoardMoreMenu();

  document.body.classList.add(
    'sidebar-drawer-open'
  );

  document.body.classList.remove(
    'inspector-drawer-open'
  );

  if (els.responsiveOverlay) {
    els.responsiveOverlay.classList.remove(
      'hidden'
    );
  }
}

function openInspectorDrawer() {
  closeTopMenus();
  closeBoardMoreMenu();

  document.body.classList.add(
    'inspector-drawer-open'
  );

  document.body.classList.remove(
    'sidebar-drawer-open'
  );

  if (els.responsiveOverlay) {
    els.responsiveOverlay.classList.remove(
      'hidden'
    );
  }
}

function applyLayoutMode() {
  const mode =
    resolveLayoutMode();

  currentResolvedLayoutMode =
    mode;

  document.body.dataset.layoutPreference =
    currentLayoutPreference;

  document.body.dataset.layoutMode =
    mode;

  document.body.classList.toggle(
    'layout-desktop',
    mode === 'desktop'
  );

  document.body.classList.toggle(
    'layout-compact',
    mode === 'compact'
  );

  document.body.classList.toggle(
    'layout-mobile',
    mode === 'mobile'
  );

  closeTopMenus();

if (mode === 'desktop') {
  closeResponsiveDrawers();
}

  document
    .querySelectorAll('[data-layout-choice]')
    .forEach(button => {
      const active =
        button.dataset.layoutChoice === currentLayoutPreference;

      button.classList.toggle(
        'active',
        active
      );
    });
}

function setLayoutPreference(mode = 'auto') {
  saveLayoutPreference(mode);
  applyLayoutMode();
}

//wire ur shit here

function setupEvents() {
  
  [
  els.localGraphShowExplicit,
  els.localGraphShowCollections,
  els.localGraphShowFolders,
  els.localGraphShowSources,
  els.localGraphShowTags
]
  .filter(Boolean)
  .forEach(input => {
    input.onchange = async () => {
await refreshLocalGraphData({
  keepLayout: true
});

requestAnimationFrame(() => {
  fitLocalGraphToView();
});
    };
  });
  
  if (els.openLocalGraphBtn) {
  els.openLocalGraphBtn.onclick =
    openLocalGraphModal;
}
  
  document
  .querySelectorAll('.board-more-panel button')
  .forEach(button => {
    button.addEventListener('click', () => {
      closeBoardMoreMenu();
    });
  });
  
  if (els.outlinerViewSelect) {
  els.outlinerViewSelect.onchange = () => {
    syncOutlinerViewModeClass();
    renderOutliner();
  };
}
  
  setupTopMenus();
  
  if (els.renameSplitPaneDocBtn) {
  els.renameSplitPaneDocBtn.onclick =
    renameSplitPaneDocument;
}
  
  currentLayoutPreference =
  getLayoutPreference();

applyLayoutMode();

window.addEventListener('resize', () => {
  if (currentLayoutPreference === 'auto') {
    applyLayoutMode();
  }
});

document
  .querySelectorAll('[data-layout-choice]')
  .forEach(button => {
    button.addEventListener('click', () => {
      setLayoutPreference(
        button.dataset.layoutChoice
      );

      button
        .closest('.top-menu')
        ?.removeAttribute('open');
    });
  });

if (els.openSidebarDrawerBtn) {
  els.openSidebarDrawerBtn.onclick =
    openSidebarDrawer;
}

if (els.openInspectorDrawerBtn) {
  els.openInspectorDrawerBtn.onclick =
    openInspectorDrawer;
}

if (els.closeSidebarDrawerBtn) {
  els.closeSidebarDrawerBtn.onclick =
    closeResponsiveDrawers;
}

if (els.closeInspectorDrawerBtn) {
  els.closeInspectorDrawerBtn.onclick =
    closeResponsiveDrawers;
}

if (els.responsiveOverlay) {
  els.responsiveOverlay.onclick =
    closeResponsiveDrawers;
}
  
  if (els.openProjectCommentsBtn) {
  els.openProjectCommentsBtn.onclick =
    openProjectCommentsPanel;
}

if (els.closeProjectCommentsBtn) {
  els.closeProjectCommentsBtn.onclick =
    closeProjectCommentsPanel;
}
  
  if (els.toggleResolvedCommentsBtn) {
  els.toggleResolvedCommentsBtn.onclick =
    toggleResolvedInlineComments;
}
  
  if (els.addInlineCommentBtn) {
  els.addInlineCommentBtn.onclick =
    addInlineCommentFromSelection;
}
  
  if (els.openCommentsDrawerBtn) {
  els.openCommentsDrawerBtn.onclick =
    openCommentsDrawer;
}
  
  if (
  els.projectCommentsPanel &&
  els.projectCommentsPanelHead
) {
  els.projectCommentsPanelHead.addEventListener(
    'pointerdown',
    event => {

      if (
        event.target.closest('button')
      ) {
        return;
      }

      const rect =
        els.projectCommentsPanel.getBoundingClientRect();

      projectCommentsDragging =
        true;

      projectCommentsDragStart = {
        x: event.clientX,
        y: event.clientY
      };

      projectCommentsStart = {
        x: rect.left,
        y: rect.top
      };

      try {
        els.projectCommentsPanelHead
          .setPointerCapture(
            event.pointerId
          );
      } catch {}
    }
  );

  els.projectCommentsPanelHead.addEventListener(
    'pointermove',
    event => {

      if (
        !projectCommentsDragging
      ) {
        return;
      }

      const dx =
        event.clientX -
        projectCommentsDragStart.x;

      const dy =
        event.clientY -
        projectCommentsDragStart.y;

      const nextX =
        projectCommentsStart.x + dx;

      const nextY =
        projectCommentsStart.y + dy;

      els.projectCommentsPanel.style.left =
        `${nextX}px`;

      els.projectCommentsPanel.style.top =
        `${nextY}px`;

      els.projectCommentsPanel.style.right =
        'auto';
    }
  );

  els.projectCommentsPanelHead.addEventListener(
    'pointerup',
    event => {

      projectCommentsDragging =
        false;

      try {
        els.projectCommentsPanelHead
          .releasePointerCapture(
            event.pointerId
          );
      } catch {}
    }
  );

  els.projectCommentsPanelHead.addEventListener(
    'pointercancel',
    () => {
      projectCommentsDragging =
        false;
    }
  );
}
  
  if (els.commentsDrawerHead && els.commentsDrawer) {
  els.commentsDrawerHead.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    commentsDrawerDragging = true;

    const rect =
      els.commentsDrawer.getBoundingClientRect();

    commentsDrawerDragStart = {
      x: event.clientX,
      y: event.clientY
    };

    commentsDrawerStart = {
      x: rect.left,
      y: rect.top
    };

    els.commentsDrawerHead.setPointerCapture(
      event.pointerId
    );
  });

  els.commentsDrawerHead.addEventListener('pointermove', event => {
    if (!commentsDrawerDragging) {
      return;
    }

    event.preventDefault();

    const dx =
      event.clientX - commentsDrawerDragStart.x;

    const dy =
      event.clientY - commentsDrawerDragStart.y;

    const next =
      clampCommentsDrawerPosition(
        commentsDrawerStart.x + dx,
        commentsDrawerStart.y + dy
      );

    els.commentsDrawer.style.left =
      `${next.x}px`;

    els.commentsDrawer.style.top =
      `${next.y}px`;
  });

  els.commentsDrawerHead.addEventListener('pointerup', event => {
    if (!commentsDrawerDragging) {
      return;
    }

    commentsDrawerDragging = false;

    saveCommentsDrawerPosition();

    try {
      els.commentsDrawerHead.releasePointerCapture(
        event.pointerId
      );
    } catch {}
  });

  els.commentsDrawerHead.addEventListener('pointercancel', () => {
    commentsDrawerDragging = false;
  });
}

if (els.closeCommentsDrawerBtn) {
  els.closeCommentsDrawerBtn.onclick =
    closeCommentsDrawer;
}
  
  if (els.showBoardMinimapBtn) {
  els.showBoardMinimapBtn.onclick =
    toggleBoardMinimap;
}
  
  if (els.manageCustomMetadataFieldsBtn) {
  els.manageCustomMetadataFieldsBtn.onclick =
    openCustomMetadataFieldsModal;
}
  

if (els.closeCustomMetadataFieldsModalBtn) {
  els.closeCustomMetadataFieldsModalBtn.onclick =
    closeCustomMetadataFieldsModal;
}

if (els.customMetadataFieldTypeSelect) {
  els.customMetadataFieldTypeSelect.onchange =
    updateCustomMetadataOptionsVisibility;
}

if (els.addCustomMetadataFieldBtn) {
  els.addCustomMetadataFieldBtn.onclick =
    submitCustomMetadataFieldAdd;
}
  
  if (els.manageCustomMetadataFieldsInlineBtn) {
  els.manageCustomMetadataFieldsInlineBtn.onclick =
    openCustomMetadataFieldsModal;
}

  if (els.editSplitPaneBtn) {
  els.editSplitPaneBtn.onclick =
    toggleSplitPaneEditable;
}

if (els.saveSplitPaneBtn) {
  els.saveSplitPaneBtn.onclick =
    saveSplitPaneDocument;
}
  
if (els.customMetadataFieldsModal) {
  els.customMetadataFieldsModal.addEventListener('click', event => {
    if (event.target === els.customMetadataFieldsModal) {
      closeCustomMetadataFieldsModal();
    }
  });
}
  
  if (els.manageOutlinerCustomColumnsBtn) {
  els.manageOutlinerCustomColumnsBtn.onclick =
    openOutlinerCustomColumnsModal;
}

if (els.closeOutlinerCustomColumnsBtn) {
  els.closeOutlinerCustomColumnsBtn.onclick =
    closeOutlinerCustomColumnsModal;
}

if (els.outlinerCustomColumnsModal) {
  els.outlinerCustomColumnsModal.addEventListener('click', event => {
    if (event.target === els.outlinerCustomColumnsModal) {
      closeOutlinerCustomColumnsModal();
    }
  });
}
  
  if (els.boardMinimap) {
  const minimapHead =
    els.boardMinimap.querySelector(
      '.board-minimap-head'
    );

  if (minimapHead) {
    minimapHead.addEventListener(
      'pointerdown',
      event => {
        /*
          Do not start dragging if clicking the close button.
        */
        if (event.target.closest('button')) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        isBoardMinimapPanelDragging = true;

        const parentRect =
          getBoardMinimapParentRect();

        const minimapRect =
          els.boardMinimap.getBoundingClientRect();

        boardMinimapPanelDragStart = {
          x: event.clientX,
          y: event.clientY
        };

        boardMinimapPanelStart = {
          x: minimapRect.left - parentRect.left,
          y: minimapRect.top - parentRect.top
        };

        /*
          Switch to explicit left/top while dragging.
        */
        els.boardMinimap.style.right =
          'auto';

        els.boardMinimap.style.bottom =
          'auto';

        minimapHead.setPointerCapture(
          event.pointerId
        );
      }
    );

    minimapHead.addEventListener(
      'pointermove',
      event => {
        if (!isBoardMinimapPanelDragging) {
          return;
        }

        event.preventDefault();

        const dx =
          event.clientX -
          boardMinimapPanelDragStart.x;

        const dy =
          event.clientY -
          boardMinimapPanelDragStart.y;

        const next =
          clampBoardMinimapPosition(
            boardMinimapPanelStart.x + dx,
            boardMinimapPanelStart.y + dy
          );

        els.boardMinimap.style.left =
          `${next.x}px`;

        els.boardMinimap.style.top =
          `${next.y}px`;

        updateBoardMinimapViewport();
      }
    );

    minimapHead.addEventListener(
      'pointerup',
      event => {
        if (!isBoardMinimapPanelDragging) {
          return;
        }

        isBoardMinimapPanelDragging = false;

        saveBoardMinimapPosition();

        try {
          minimapHead.releasePointerCapture(
            event.pointerId
          );
        } catch {}
      }
    );

    minimapHead.addEventListener(
      'pointercancel',
      () => {
        isBoardMinimapPanelDragging = false;
      }
    );
  }
}

if (els.toggleBoardMinimapBtn) {
  els.toggleBoardMinimapBtn.onclick =
    hideBoardMinimap;
}
  
 if (els.refreshDocumentMapBtn) {
  els.refreshDocumentMapBtn.onclick =
    scheduleDocumentMapRender;
}

if (els.editor) {
  els.editor.addEventListener(
    'input',
    scheduleDocumentMapRender
  );
}
  
  window.addEventListener(
  'naviwriter:editor-input',
  scheduleDocumentMapRender
);

if (els.boardSurface) {
  els.boardSurface.addEventListener('scroll', () => {
    updateBoardMinimapViewport();
  });
}
  
  if (els.toggleLocalGraphMinimapBtn) {
  els.toggleLocalGraphMinimapBtn.onclick =
    () => {
      els.localGraphMinimap?.classList.add('hidden');
    };
}

if (els.localGraphMinimapBody) {
  els.localGraphMinimapBody.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();

    isLocalGraphMinimapDragging = true;

    panLocalGraphToMinimapPoint(
      event.clientX,
      event.clientY
    );

    els.localGraphMinimapBody.setPointerCapture(
      event.pointerId
    );
  });

  els.localGraphMinimapBody.addEventListener('pointermove', event => {
    if (!isLocalGraphMinimapDragging) {
      return;
    }

    event.preventDefault();

    panLocalGraphToMinimapPoint(
      event.clientX,
      event.clientY
    );
  });

  els.localGraphMinimapBody.addEventListener('pointerup', event => {
    isLocalGraphMinimapDragging = false;

    try {
      els.localGraphMinimapBody.releasePointerCapture(
        event.pointerId
      );
    } catch {}
  });
}

if (els.boardMinimapBody) {
  els.boardMinimapBody.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();

    isBoardMinimapDragging = true;

    panBoardToMinimapPoint(
      event.clientX,
      event.clientY
    );

    els.boardMinimapBody.setPointerCapture(
      event.pointerId
    );
  });

  els.boardMinimapBody.addEventListener('pointermove', event => {
    if (!isBoardMinimapDragging) {
      return;
    }

    event.preventDefault();

    panBoardToMinimapPoint(
      event.clientX,
      event.clientY
    );
  });

  els.boardMinimapBody.addEventListener('pointerup', event => {
    isBoardMinimapDragging = false;

    try {
      els.boardMinimapBody.releasePointerCapture(
        event.pointerId
      );
    } catch {}
  });
}
  
  if (els.localGraphSurface) {
  els.localGraphSurface.addEventListener('click', async event => {
    const closeDetailsBtn =
      event.target.closest('#closeLocalGraphDetailsBtn');

    if (closeDetailsBtn) {
      event.preventDefault();
      event.stopPropagation();

      clearLocalGraphSelection();
      return;
    }

    const centerNodeBtn =
      event.target.closest('#centerLocalGraphNodeBtn');

    if (centerNodeBtn) {
      event.preventDefault();
      event.stopPropagation();

      if (localGraphSelectedNodeId) {
        centerLocalGraphOnNode(
          localGraphSelectedNodeId
        );
      }

      return;
    }

    const openNodeBtn =
      event.target.closest('#openLocalGraphNodeBtn');

    if (openNodeBtn) {
      event.preventDefault();
      event.stopPropagation();

      await openSelectedLocalGraphNode();
      return;
    }
  });
}
  
  if (els.openGlobalGraphBtn) {
  els.openGlobalGraphBtn.onclick =
    async () => {
      closeRelationshipDashboardModal();
      await openGlobalGraphModal();
    };
}
  
  if (els.openRelationshipDashboardBtn) {
  els.openRelationshipDashboardBtn.onclick =
    openRelationshipDashboardModal;
}

if (els.closeRelationshipDashboardBtn) {
  els.closeRelationshipDashboardBtn.onclick =
    closeRelationshipDashboardModal;
}

if (els.refreshRelationshipDashboardBtn) {
  els.refreshRelationshipDashboardBtn.onclick =
    renderRelationshipDashboard;
}

if (els.openOutlinerFromDashboardBtn) {
  els.openOutlinerFromDashboardBtn.onclick =
    async () => {
      closeRelationshipDashboardModal();

      if (els.outlinerViewSelect) {
        els.outlinerViewSelect.value = 'relationships';
      }

      await openOutlinerModal();
    };
}

if (els.relationshipDashboardModal) {
  els.relationshipDashboardModal.addEventListener('click', event => {
    if (event.target === els.relationshipDashboardModal) {
      closeRelationshipDashboardModal();
    }
  });
}

if (els.closeLocalGraphModalBtn) {
  els.closeLocalGraphModalBtn.onclick =
    closeLocalGraphModal;
}

if (els.localGraphZoomOutBtn) {
  els.localGraphZoomOutBtn.onclick =
    () => zoomLocalGraph(-0.12);
}

if (els.localGraphZoomInBtn) {
  els.localGraphZoomInBtn.onclick =
    () => zoomLocalGraph(0.12);
}

if (els.localGraphResetBtn) {
  els.localGraphResetBtn.onclick =
    () => {
      resetLocalGraphState();
      autoLayoutLocalGraph();
      renderLocalGraph();

      requestAnimationFrame(() => {
        fitLocalGraphToView();
      });
    };
}

if (els.localGraphModal) {
  els.localGraphModal.addEventListener(
    'click',
    event => {
      if (event.target === els.localGraphModal) {
        closeLocalGraphModal();
      }
    }
  );
}

setupLocalGraphInteractions();
  
  if (els.outlinerShowSourceRelationships) {
  els.outlinerShowSourceRelationships.onchange =
    renderOutliner;
}

if (els.outlinerShowTagRelationships) {
  els.outlinerShowTagRelationships.onchange =
    renderOutliner;
}
  
if (els.outlinerViewSelect) {
  els.outlinerViewSelect.onchange = () => {
    syncOutlinerViewModeClass();
    renderOutliner();
  };
}

if (els.outlinerShowExplicitRelationships) {
  els.outlinerShowExplicitRelationships.onchange =
    renderOutliner;
}

if (els.outlinerShowCollectionRelationships) {
  els.outlinerShowCollectionRelationships.onchange =
    renderOutliner;
}

if (els.outlinerShowFolderRelationships) {
  els.outlinerShowFolderRelationships.onchange =
    renderOutliner;
}


  
  if (els.manageRelationshipTypesBtn) {
  els.manageRelationshipTypesBtn.onclick =
    openRelationshipTypesModal;
}

if (els.closeRelationshipTypesModalBtn) {
  els.closeRelationshipTypesModalBtn.onclick =
    closeRelationshipTypesModal;
}

if (els.cancelRelationshipTypesModalBtn) {
  els.cancelRelationshipTypesModalBtn.onclick =
    closeRelationshipTypesModal;
}

if (els.addRelationshipTypeBtn) {
  els.addRelationshipTypeBtn.onclick =
    submitRelationshipTypeAdd;
}

if (els.relationshipTypeNameInput) {
  els.relationshipTypeNameInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitRelationshipTypeAdd();
    }
  });
}

if (els.relationshipTypesModal) {
  els.relationshipTypesModal.addEventListener('click', event => {
    if (event.target === els.relationshipTypesModal) {
      closeRelationshipTypesModal();
    }
  });
}
  
 if (els.outlinerViewSelect) {
  els.outlinerViewSelect.onchange = () => {
    syncOutlinerViewModeClass();
    renderOutliner();
  };
}
  
  if (els.createRelationshipBtn) {
  els.createRelationshipBtn.onclick = openRelationshipModal;
}

if (els.closeRelationshipModalBtn) {
  els.closeRelationshipModalBtn.onclick = closeRelationshipModal;
}

if (els.cancelRelationshipModalBtn) {
  els.cancelRelationshipModalBtn.onclick = closeRelationshipModal;
}

if (els.submitRelationshipModalBtn) {
  els.submitRelationshipModalBtn.onclick = submitRelationshipModal;
}

if (els.relationshipTargetTypeSelect) {
  els.relationshipTargetTypeSelect.onchange = populateRelationshipTargetSelect;
}

if (els.relationshipModal) {
  els.relationshipModal.addEventListener('click', event => {
    if (event.target === els.relationshipModal) {
      closeRelationshipModal();
    }
  });
}
  
  if (els.addDocsToCollectionBtn) {
  els.addDocsToCollectionBtn.onclick = openCollectionDocPicker;
}

if (els.closeCollectionDocPickerBtn) {
  els.closeCollectionDocPickerBtn.onclick = closeCollectionDocPicker;
}

if (els.cancelCollectionDocPickerBtn) {
  els.cancelCollectionDocPickerBtn.onclick = closeCollectionDocPicker;
}

if (els.submitCollectionDocPickerBtn) {
  els.submitCollectionDocPickerBtn.onclick = submitCollectionDocPicker;
}

if (els.collectionDocPickerSearch) {
  els.collectionDocPickerSearch.oninput = renderCollectionDocPickerList;
}

if (els.collectionDocPickerTypeFilter) {
  els.collectionDocPickerTypeFilter.onchange = renderCollectionDocPickerList;
}

if (els.collectionDocPickerModal) {
  els.collectionDocPickerModal.addEventListener('click', event => {
    if (event.target === els.collectionDocPickerModal) {
      closeCollectionDocPicker();
    }
  });
}
  
  if (els.openCollectionsBtn) {
  els.openCollectionsBtn.onclick = openCollectionsModal;
}

if (els.closeCollectionsModalBtn) {
  els.closeCollectionsModalBtn.onclick = closeCollectionsModal;
}

if (els.collectionsModal) {
  els.collectionsModal.addEventListener('click', event => {
    if (event.target === els.collectionsModal) {
      closeCollectionsModal();
    }
  });
}

if (els.newCollectionBtn) {
  els.newCollectionBtn.onclick = createCollection;
}

if (els.addCurrentDocToCollectionBtn) {
  els.addCurrentDocToCollectionBtn.onclick = addCurrentDocumentToCollection;
}

if (els.renameCollectionBtn) {
  els.renameCollectionBtn.onclick = renameActiveCollection;
}

if (els.deleteCollectionBtn) {
  els.deleteCollectionBtn.onclick = deleteActiveCollection;
}
  
  if (els.sourcesModeBtn) {
  els.sourcesModeBtn.onclick = () => {
    const next =
      !document.body.classList.contains('sources-mode-active');

    setSourcesMode(next);
  };
}

if (els.addSourceBtn) {
  els.addSourceBtn.onclick = () => {
    openSourceModal();
  };
}

if (els.closeSourceModalBtn) {
  els.closeSourceModalBtn.onclick = closeSourceModal;
}

if (els.cancelSourceModalBtn) {
  els.cancelSourceModalBtn.onclick = closeSourceModal;
}

if (els.submitSourceModalBtn) {
  els.submitSourceModalBtn.onclick = submitSourceModal;
}

if (els.sourceModal) {
  els.sourceModal.addEventListener('click', event => {
    if (event.target === els.sourceModal) {
      closeSourceModal();
    }
  });
}
  
 if (els.openSplitEditorBtn) {
  els.openSplitEditorBtn.onclick = () => {
  closeBoardMoreMenu();
  openSplitEditor();
};
}

if (els.closeSplitEditorBtn) {
  els.closeSplitEditorBtn.onclick = () => {
    closeSplitEditor();
  };
}

if (els.splitDocSelect) {
  els.splitDocSelect.onchange = handleSplitDocSelectChange;
}

if (els.openSplitDocAsMainBtn) {
  els.openSplitDocAsMainBtn.onclick = openSplitDocAsMain;
}
  
  if (els.outlinerStatusFilterSelect) {
  els.outlinerStatusFilterSelect.onchange = renderOutliner;
}

if (els.outlinerTypeFilterSelect) {
  els.outlinerTypeFilterSelect.onchange = renderOutliner;
}

if (els.outlinerFolderFilterSelect) {
  els.outlinerFolderFilterSelect.onchange = renderOutliner;
}

if (els.outlinerSortSelect) {
  els.outlinerSortSelect.onchange = renderOutliner;
}
  
  if (els.openOutlinerBtn) {
  els.openOutlinerBtn.onclick = openOutlinerModal;
}

if (els.closeOutlinerModalBtn) {
  els.closeOutlinerModalBtn.onclick = closeOutlinerModal;
}

if (els.outlinerModal) {
  els.outlinerModal.addEventListener('click', event => {
    if (event.target === els.outlinerModal) {
      closeOutlinerModal();
    }
  });
}

if (els.outlinerScopeSelect) {
  els.outlinerScopeSelect.onchange = renderOutliner;
}

if (els.outlinerSearchInput) {
  els.outlinerSearchInput.oninput = renderOutliner;
}

if (els.refreshOutlinerBtn) {
  els.refreshOutlinerBtn.onclick = renderOutliner;
}
  
  if (els.decreaseBoardFontBtn) {
  els.decreaseBoardFontBtn.onclick = () => {
    adjustSelectedBoardFontSize(-1);
  };
}

if (els.increaseBoardFontBtn) {
  els.increaseBoardFontBtn.onclick = () => {
    adjustSelectedBoardFontSize(1);
  };
}

if (els.resetBoardFontBtn) {
  els.resetBoardFontBtn.onclick = resetSelectedBoardFontSize;
}
  
  if (els.duplicateBoardItemBtn) {
  els.duplicateBoardItemBtn.onclick = duplicateSelectedBoardItem;
}

if (els.bringBoardItemFrontBtn) {
  els.bringBoardItemFrontBtn.onclick = bringSelectedBoardItemToFront;
}

if (els.sendBoardItemBackBtn) {
  els.sendBoardItemBackBtn.onclick = sendSelectedBoardItemToBack;
}

if (els.familyConnectorBtn) {
  els.familyConnectorBtn.onclick = createFamilyConnector;
}

if (els.resetBoardZoomBtn) {
  els.resetBoardZoomBtn.onclick = resetBoardZoom;
}
  
  if (els.bookThemeSelect) {
  els.bookThemeSelect.onchange = event => {
    applyBookTheme(event.target.value);
  };
}

if (els.applyCompileProfileBtn) {
  els.applyCompileProfileBtn.onclick = applySelectedCompileProfile;
}

if (els.saveCompileProfileBtn) {
  els.saveCompileProfileBtn.onclick = saveCurrentCompileProfile;
}

if (els.deleteCompileProfileBtn) {
  els.deleteCompileProfileBtn.onclick = deleteSelectedCompileProfile;
}
  
  if (els.closeChoiceModalBtn) {
  els.closeChoiceModalBtn.onclick = closeChoiceModal;
}

if (els.choiceModal) {
  els.choiceModal.addEventListener('click', event => {
    if (event.target === els.choiceModal) {
      closeChoiceModal();
    }
  });
}

if (els.closeBoardLinkModalBtn) {
  els.closeBoardLinkModalBtn.onclick = closeBoardLinkModal;
}

if (els.cancelBoardLinkModalBtn) {
  els.cancelBoardLinkModalBtn.onclick = closeBoardLinkModal;
}

if (els.submitBoardLinkModalBtn) {
  els.submitBoardLinkModalBtn.onclick = submitBoardLinkModal;
}

if (els.boardLinkModal) {
  els.boardLinkModal.addEventListener('click', event => {
    if (event.target === els.boardLinkModal) {
      closeBoardLinkModal();
    }
  });
}

[
  els.boardLinkTitleInput,
  els.boardLinkUrlInput
]
  .filter(Boolean)
  .forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitBoardLinkModal();
      }
    });
  });

if (els.closeBoardConnectionModalBtn) {
  els.closeBoardConnectionModalBtn.onclick = closeBoardConnectionModal;
}

if (els.cancelBoardConnectionModalBtn) {
  els.cancelBoardConnectionModalBtn.onclick = closeBoardConnectionModal;
}

if (els.submitBoardConnectionModalBtn) {
  els.submitBoardConnectionModalBtn.onclick = submitBoardConnectionModal;
}

if (els.boardConnectionModal) {
  els.boardConnectionModal.addEventListener('click', event => {
    if (event.target === els.boardConnectionModal) {
      closeBoardConnectionModal();
    }
  });
}

if (els.boardConnectionLabelInput) {
  els.boardConnectionLabelInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitBoardConnectionModal();
    }
  });
}
  
  if (els.closeBoardPersonModalBtn) {
  els.closeBoardPersonModalBtn.onclick = closeBoardPersonModal;
}

if (els.cancelBoardPersonModalBtn) {
  els.cancelBoardPersonModalBtn.onclick = closeBoardPersonModal;
}

if (els.submitBoardPersonModalBtn) {
  els.submitBoardPersonModalBtn.onclick = submitBoardPersonModal;
}

if (els.boardPersonModal) {
  els.boardPersonModal.addEventListener('click', event => {
    if (event.target === els.boardPersonModal) {
      closeBoardPersonModal();
    }
  });
}

[
  els.boardPersonNameInput,
  els.boardPersonRoleInput,
  els.boardPersonNotesInput
]
  .filter(Boolean)
  .forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitBoardPersonModal();
      }
    });
  });
  
  if (els.closeMessageModalBtn) {
  els.closeMessageModalBtn.onclick = closeMessageModal;
}

if (els.okMessageModalBtn) {
  els.okMessageModalBtn.onclick = closeMessageModal;
}

if (els.messageModal) {
  els.messageModal.addEventListener('click', event => {
    if (event.target === els.messageModal) {
      closeMessageModal();
    }
  });
}
  
  if (els.closeTextInputModalBtn) {
  els.closeTextInputModalBtn.onclick = closeTextInputModal;
}

if (els.cancelTextInputModalBtn) {
  els.cancelTextInputModalBtn.onclick = closeTextInputModal;
}

if (els.submitTextInputModalBtn) {
  els.submitTextInputModalBtn.onclick = submitTextInputModal;
}

if (els.textInputModalField) {
  els.textInputModalField.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitTextInputModal();
    }
  });
}

if (els.textInputModal) {
  els.textInputModal.addEventListener('click', event => {
    if (event.target === els.textInputModal) {
      closeTextInputModal();
    }
  });
}

if (els.closeConfirmModalBtn) {
  els.closeConfirmModalBtn.onclick = closeConfirmModal;
}

if (els.cancelConfirmModalBtn) {
  els.cancelConfirmModalBtn.onclick = closeConfirmModal;
}

if (els.submitConfirmModalBtn) {
  els.submitConfirmModalBtn.onclick = () => {
    resolveConfirmModal(true);
  };
}

if (els.confirmModal) {
  els.confirmModal.addEventListener('click', event => {
    if (event.target === els.confirmModal) {
      closeConfirmModal();
    }
  });
}
  
  if (els.closeMatterPresetModalBtn) {
  els.closeMatterPresetModalBtn.onclick = closeMatterPresetPicker;
}

if (els.matterPresetModal) {
  els.matterPresetModal.addEventListener('click', event => {
    if (event.target === els.matterPresetModal) {
      closeMatterPresetPicker();
    }
  });
}
  
  if (els.saveProjectMetaBtn) {
  els.saveProjectMetaBtn.onclick = saveProjectMetadata;
}
  
  if (els.coverImageInput) {
  els.coverImageInput.onchange = handleCoverImageFile;
}
  
  if (els.toggleInspectorSectionsBtn) {
  els.toggleInspectorSectionsBtn.onclick = toggleAllInspectorSections;
}
  
  setupInspectorTabs();
  
  if (els.insertEndnoteBtn) {
  els.insertEndnoteBtn.onclick = () => {
    NaviEditor.insertEndnote();
    scheduleAutosave();
    updateInspector();
  };
}

if (els.splitDocBtn) {
  els.splitDocBtn.onclick = async () => {
    const docs = NaviEditor.splitByHeadings();

    if (!docs.length) {
      showAppNotice(
  'No headings found to split.',
  'Nothing to split'
);
      return;
    }

    showAppNotice(
  'Split preview is not wired yet.'
);
  };
}
  
  if (els.openProjectFileBtn) {
  els.openProjectFileBtn.onclick = handleOpenProjectFile;
}
  
  if (els.compileExportBtn) {
  els.compileExportBtn.onclick = openCompileModal;
}

if (els.closeCompileModalBtn) {
  els.closeCompileModalBtn.onclick = closeCompileModal;
}

if (els.cancelCompileBtn) {
  els.cancelCompileBtn.onclick = closeCompileModal;
}

if (els.runCompileBtn) {
  els.runCompileBtn.onclick = runCompileExport;
}

wireCompileOptionPreviewEvents();

if (els.compileFormatSelect) {
  els.compileFormatSelect.onchange = renderCompilePreview;
}

if (els.saveProjectAsBtn) {
  els.saveProjectAsBtn.onclick = handleSaveProjectAs;
}

if (els.saveProjectFileBtn) {
  els.saveProjectFileBtn.onclick = handleSaveProjectFile;
}

if (els.projectAutosaveSelect) {
  els.projectAutosaveSelect.onchange = handleProjectAutosaveChange;
}
  
  if (els.takeSnapshotBtn) {
  els.takeSnapshotBtn.onclick = handleTakeSnapshot;
}
  
  if (els.exportProjectBackupBtn) {
  els.exportProjectBackupBtn.onclick = handleExportProjectBackup;
}

if (els.importProjectBackupBtn) {
  els.importProjectBackupBtn.onclick = handleImportProjectBackupClick;
}

if (els.projectBackupInput) {
  els.projectBackupInput.onchange = handleImportProjectBackupFile;
}

if (els.snapshotHistoryBtn) {
  els.snapshotHistoryBtn.onclick = openSnapshotHistory;
}

if (els.closeSnapshotModalBtn) {
  els.closeSnapshotModalBtn.onclick = closeSnapshotHistory;
}

if (els.snapshotModal) {
  els.snapshotModal.addEventListener('click', event => {
    if (event.target === els.snapshotModal) {
      closeSnapshotHistory();
    }
  });
}


if (els.writeModeBtn) {
  els.writeModeBtn.onclick = () => {
    document.body.classList.remove('sources-mode-active');
    setBoardMode(false);
    updateWorkspaceModeButtons('write');
  };
}

if (els.boardModeBtn) {
  els.boardModeBtn.onclick = () => {
    document.body.classList.remove('sources-mode-active');
    setBoardMode(true);
    updateWorkspaceModeButtons('board');
  };
}

if (els.addBoardNoteBtn) {
  els.addBoardNoteBtn.onclick = addBoardNote;
}

if (els.addBoardImageBtn && els.boardImageInput) {
  els.addBoardImageBtn.onclick = () => {
    els.boardImageInput.click();
  };

  els.boardImageInput.onchange = async event => {
    const file = event.target.files?.[0];

    if (file) {
      await addBoardImageFile(file);
    }

    event.target.value = '';
  };
}

if (els.addBoardLinkBtn) {
  els.addBoardLinkBtn.onclick = addBoardLink;
}

  if (els.closePdfSubdocModalBtn) {
  els.closePdfSubdocModalBtn.onclick = closePdfSubdocModal;
}

if (els.pdfUploadNewBtn) {
  els.pdfUploadNewBtn.onclick = handleUploadPdfSubdoc;
}

if (els.pdfBlankNoteBtn) {
  els.pdfBlankNoteBtn.onclick = createBlankPdfSubdoc;
}

if (els.pdfSubdocModal) {
  els.pdfSubdocModal.addEventListener('click', event => {
    if (event.target === els.pdfSubdocModal) {
      closePdfSubdocModal();
    }
  });
}

  if (els.closeSubdocModalBtn) {
  els.closeSubdocModalBtn.onclick = closeSubdocTypeModal;
}

if (els.subdocTypeModal) {
  els.subdocTypeModal.addEventListener('click', event => {
    if (event.target === els.subdocTypeModal) {
      closeSubdocTypeModal();
    }

    const card = event.target.closest('[data-subdoc-type]');

    if (!card) return;

    createSubDocumentOfType(card.dataset.subdocType);
  });
}

  if (els.closeFindPanelBtn) {
  els.closeFindPanelBtn.onclick = closeFindPanel;
}

if (els.floatingFindBtn) {
  els.floatingFindBtn.onclick = runFloatingFind;
}

if (els.floatingFindInput) {
  els.floatingFindInput.oninput = runFloatingFind;
}

if (els.floatingFindScopeSelect) {
  els.floatingFindScopeSelect.onchange = () => {
    runFloatingFind();
  };
}

if (els.floatingReplaceSelectedBtn) {
  els.floatingReplaceSelectedBtn.onclick = replaceSelectedFindResult;
}

if (els.floatingReplaceAllBtn) {
  els.floatingReplaceAllBtn.onclick = replaceAllFindResults;
}
  
  if (els.newManuscriptBtn) {
  els.newManuscriptBtn.onclick = handleNewManuscript;
}
  if (els.newSubDocBtn) {
  els.newSubDocBtn.onclick = handleNewSubDocument;
}
  if (els.importPdfBtn) {
  els.importPdfBtn.onclick = handlePdfImportClick;
}

if (els.pdfInput) {
  els.pdfInput.onchange = handlePdfImportFile;
}

  if (els.findNextBtn) {
  els.findNextBtn.onclick = () => {
    openFindPanel(els.findInput?.value || '');
  };
}

  if (els.replaceBtn) {
  els.replaceBtn.onclick = () => {
    openFindPanel(els.findInput?.value || '');

    if (els.floatingReplaceInput && els.replaceInput) {
      els.floatingReplaceInput.value = els.replaceInput.value || '';
    }
  };
}

  if (els.replaceAllBtn) {
  els.replaceAllBtn.onclick = () => {
    openFindPanel(els.findInput?.value || '');

    if (els.floatingReplaceInput && els.replaceInput) {
      els.floatingReplaceInput.value = els.replaceInput.value || '';
    }

    replaceAllFindResults();
  };
}

  if (els.saveGoalBtn) {
    els.saveGoalBtn.onclick = saveDocumentGoal;
  }

  if (els.saveMetaBtn) {
    els.saveMetaBtn.onclick = saveCurrentMetadata;
  }
  
  if (els.applyStatusToSubdocsBtn) {
  els.applyStatusToSubdocsBtn.onclick = applyCurrentStatusToSubdocs;
}
  
  if (els.docStatusSelect) {
  els.docStatusSelect.onchange = () => {
    saveCurrentMetadata();
  };
}

  window.addEventListener('naviwriter:editor-input', () => {
    updateInspector();
  });
  if (els.newDocBtn) {
    els.newDocBtn.onclick = handleNewDocument;
  }

  if (els.renameDocBtn) {
    els.renameDocBtn.onclick = handleRenameDocument;
  }

  if (els.duplicateDocBtn) {
    els.duplicateDocBtn.onclick = handleDuplicateDocument;
  }

  if (els.deleteDocBtn) {
    els.deleteDocBtn.onclick = handleDeleteDocument;
  }

  if (els.exportSelect) {
  els.exportSelect.onchange = event => {
    const format = event.target.value;

    if (!format) return;

    handleExportDocument(format);

    event.target.value = '';
  };
}

  if (els.importBtn) {
    els.importBtn.onclick = handleImportClick;
  }

  if (els.importFile) {
    els.importFile.onchange = handleImportFile;
  }

  if (els.docSearch) {
    els.docSearch.oninput = handleSearch;
  }

  if (els.focusBtn) {
  els.focusBtn.onclick = () => {
    const next = !document.body.classList.contains('focus-mode');
    setFocusMode(next);
  };
  }



if (els.exitFocusBtn) {
  els.exitFocusBtn.onclick = exitFocusMode;
}

  window.addEventListener('naviwriter:manual-save', () => {
    saveCurrentDocument({ manual: true });
  });
  window.addEventListener('keydown', event => {

if (document.body.classList.contains('board-mode-active')) {
  const isUndo =
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'z';

  const isRedo =
    (event.ctrlKey || event.metaKey) &&
    (
      event.key.toLowerCase() === 'y' ||
      (event.shiftKey && event.key.toLowerCase() === 'z')
    );

  if (isUndo) {
    event.preventDefault();
    undoBoardChange();
    return;
  }

  if (isRedo) {
    event.preventDefault();
    redoBoardChange();
    return;
  }
  
  if (
  event.key === 'Escape' &&
  (
    document.body.classList.contains('sidebar-drawer-open') ||
    document.body.classList.contains('inspector-drawer-open')
  )
) {
  closeResponsiveDrawers();
  return;
}
  
  if (
  event.key === 'Escape' &&
  els.commentsDrawer &&
  !els.commentsDrawer.classList.contains('hidden')
) {
  closeCommentsDrawer();
  return;
}
  
  if (
  event.key === 'Escape' &&
  els.outlinerCustomColumnsModal &&
  !els.outlinerCustomColumnsModal.classList.contains('hidden')
) {
  closeOutlinerCustomColumnsModal();
  return;
}
  
  if (
  event.key === 'Escape' &&
  els.customMetadataFieldsModal &&
  !els.customMetadataFieldsModal.classList.contains('hidden')
) {
  closeCustomMetadataFieldsModal();
  return;
}
  
  if (
  event.key === 'Escape' &&
  els.relationshipDashboardModal &&
  !els.relationshipDashboardModal.classList.contains('hidden')
) {
  closeRelationshipDashboardModal();
  return;
}
  
  if (
  event.key === 'Escape' &&
  els.localGraphModal &&
  !els.localGraphModal.classList.contains('hidden')
) {
  closeLocalGraphModal();
  return;
}
  
  if (
  event.key === 'Escape' &&
  els.relationshipTypesModal &&
  !els.relationshipTypesModal.classList.contains('hidden')
) {
  closeRelationshipTypesModal();
  return;
}
}
    
    if (
  event.key === 'Escape' &&
  els.relationshipModal &&
  !els.relationshipModal.classList.contains('hidden')
) {
  closeRelationshipModal();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.collectionDocPickerModal &&
  !els.collectionDocPickerModal.classList.contains('hidden')
) {
  closeCollectionDocPicker();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.collectionsModal &&
  !els.collectionsModal.classList.contains('hidden')
) {
  closeCollectionsModal();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.sourceModal &&
  !els.sourceModal.classList.contains('hidden')
) {
  closeSourceModal();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.splitPane &&
  !els.splitPane.classList.contains('hidden')
) {
  closeSplitEditor();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.outlinerModal &&
  !els.outlinerModal.classList.contains('hidden')
) {
  closeOutlinerModal();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.choiceModal &&
  !els.choiceModal.classList.contains('hidden')
) {
  closeChoiceModal();
  return;
}

if (
  event.key === 'Escape' &&
  els.boardLinkModal &&
  !els.boardLinkModal.classList.contains('hidden')
) {
  closeBoardLinkModal();
  return;
}

if (
  event.key === 'Escape' &&
  els.boardConnectionModal &&
  !els.boardConnectionModal.classList.contains('hidden')
) {
  closeBoardConnectionModal();
  return;
}
    
if (event.key === 'Escape' && els.matterPresetModal && !els.matterPresetModal.classList.contains('hidden')) {
  closeMatterPresetPicker();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.boardPersonModal &&
  !els.boardPersonModal.classList.contains('hidden')
) {
  closeBoardPersonModal();
  return;
}
    
    if (
  event.key === 'Escape' &&
  els.messageModal &&
  !els.messageModal.classList.contains('hidden')
) {
  closeMessageModal();
  return;
}
    
if (
  event.key === 'Escape' &&
  els.textInputModal &&
  !els.textInputModal.classList.contains('hidden')
) {
  closeTextInputModal();
  return;
}

if (
  event.key === 'Escape' &&
  els.confirmModal &&
  !els.confirmModal.classList.contains('hidden')
) {
  closeConfirmModal();
  return;
}

  if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) {
    exitFocusMode();
  }

if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
  event.preventDefault();
  openFindPanel('');
}

  });
if (els.analysisScopeSelect) {
  els.analysisScopeSelect.onchange = () => {
    updateRepeatedTextAnalysis();
  };
}

if (els.addBoardPersonBtn) {
  els.addBoardPersonBtn.onclick = addBoardPerson;
}

if (els.connectBoardItemsBtn) {
  els.connectBoardItemsBtn.onclick = connectBoardItems;
}

if (els.exportBoardBtn) {
  els.exportBoardBtn.onclick = exportCurrentBoard;
}

if (els.connectBoardItemsBtn) {
  els.connectBoardItemsBtn.onclick = connectBoardItems;
}

if (els.zoomInBoardBtn) {
  els.zoomInBoardBtn.onclick = zoomBoardIn;
}

if (els.zoomOutBoardBtn) {
  els.zoomOutBoardBtn.onclick = zoomBoardOut;
}

if (els.colorBoardItemBtn) {
  els.colorBoardItemBtn.onclick = colorSelectedBoardItem;
}

if (els.undoBoardBtn) {
  els.undoBoardBtn.onclick = undoBoardChange;
}

if (els.undoBoardBtn) {
  els.undoBoardBtn.onclick = undoBoardChange;
}

if (els.redoBoardBtn) {
  els.redoBoardBtn.onclick = redoBoardChange;
}

}

async function exportCurrentBoard() {
  
  const boardMoreMenu =
  document.querySelector('.board-more-menu');

if (boardMoreMenu) {
  boardMoreMenu.removeAttribute('open');
}
  
  const choice = await openChoiceModal({
    title: 'Export Board',
    subtitle: 'Choose the board export format.',
    options: [
      {
        value: 'html',
        icon: '🌐',
        title: 'HTML',
        desc: 'Export a visual board page you can open in a browser.'
      },
      {
        value: 'svg',
        icon: '🖼️',
        title: 'SVG',
        desc: 'Export the board as a scalable image.'
      },
      {
        value: 'png',
        icon: '📸',
        title: 'PNG',
        desc: 'Export the board as a shareable image.'
      },
      {
        value: 'json',
        icon: '{}',
        title: 'JSON',
        desc: 'Export raw board data for backup or future importing.'
      }
    ]
  });

  if (choice === 'json') {
    exportBoardJson();
    return;
  }

  if (choice === 'svg') {
    exportBoardSvg();
    return;
  }

  if (choice === 'png') {
    await exportBoardPng();
    return;
  }

  if (choice === 'html') {
    exportBoardHtml();
  }
}

function exportBoardJson() {
  const board = getBoardSnapshot();

  const title = NaviEditor.getEditorTitle
    ? NaviEditor.getEditorTitle()
    : 'Board';

  const json = JSON.stringify(board, null, 2);

  downloadBoardFile(
    `${safeFileName(title)}-board.json`,
    json,
    'application/json'
  );
}

function renderOutlinerCollectionLinks(doc) {
  const collections =
    getCollectionsForDocument(collectionsCache, doc.id);

  if (!collections.length) {
    return '<span class="outliner-muted">—</span>';
  }

  return collections.map(collection => {
    return `
      <button
        type="button"
        class="outliner-collection-link"
        data-outliner-collection="${escapeHtml(collection.id)}"
      >
        ${escapeHtml(collection.name)}
      </button>
    `;
  }).join('');
}

async function handleSaveMeta() {
  if (!currentDocumentId) return;

  const doc =
    await NaviStorage.getDocument(currentDocumentId);

  if (!doc) return;

  doc.folder =
    els.folderInput?.value.trim() || '';

  doc.tags =
    els.tagsInput?.value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean) || [];

  doc.status =
    els.docStatusSelect?.value || 'Drafting';

  doc.pov =
    els.docPovInput?.value.trim() || '';

  doc.location =
    els.docLocationInput?.value.trim() || '';

  doc.timeline =
    els.docTimelineInput?.value.trim() || '';

  doc.characters =
    els.docCharactersInput?.value.trim() || '';

  doc.summary =
    els.docSummaryInput?.value.trim() || '';

  doc.updatedAt = Date.now();

  await NaviStorage.saveDocument(doc);

  await loadDocuments();

  NaviEditor.setSaveStatus('Details saved');
}

function exportBoardHtml() {
  const board = getBoardSnapshot();

  const title = NaviEditor.getEditorTitle
    ? NaviEditor.getEditorTitle()
    : 'Board';

  const html = buildBoardExportHtml(
    title,
    board
  );

  downloadBoardFile(
    `${safeFileName(title)}-board.html`,
    html,
    'text/html'
  );
}

async function getOutlinerBaseDocuments() {
  const scope =
    els.outlinerScopeSelect?.value || 'project';

  if (scope === 'all') {
    return await NaviStorage.getAllDocuments();
  }

  if (scope === 'folder') {
    const allDocs =
      await NaviStorage.getAllDocuments();

    return getFolderFilteredDocuments(allDocs);
  }

  if (!currentDocumentId) {
    return await NaviStorage.getAllDocuments();
  }

  const rootId =
    await getProjectRootDocumentId(currentDocumentId);

  if (!rootId) {
    return await NaviStorage.getAllDocuments();
  }

  return await getProjectDocuments(rootId);
}

function getOutlinerRelationshipToggleState() {
  return {
    explicit:
      els.outlinerShowExplicitRelationships?.checked !== false,

    collections:
      Boolean(
        els.outlinerShowCollectionRelationships?.checked
      ),

    folders:
      Boolean(
        els.outlinerShowFolderRelationships?.checked
      ),

    sources:
      Boolean(
        els.outlinerShowSourceRelationships?.checked
      ),

    tags:
      Boolean(
        els.outlinerShowTagRelationships?.checked
      )
  };
}

function buildImplicitSourceRelationships(docs = []) {
  const relationships = [];

  docs.forEach(doc => {
    const sources =
      getCurrentSourceList(doc);

    if (!sources.length) {
      return;
    }

    sources.forEach(source => {
      relationships.push(
        createImplicitRelationship({
          id: `implicit-source-${doc.id}-${source.id}`,
          sourceEntityType: 'document',
          sourceEntityId: doc.id,
          targetEntityType: 'source',
          targetEntityId: getSourceEntityId(
            doc.id,
            source.id
          ),
          relationType: 'has source',
          note: 'Implicit: research source',
          strength: 1
        })
      );
    });
  });

  return relationships;
}

function buildImplicitTagRelationships(docs = []) {
  const relationships = [];

  docs.forEach(doc => {
    const tags =
      Array.isArray(doc.tags)
        ? doc.tags
        : [];

    tags
      .map(tag => {
        return String(tag || '').trim();
      })
      .filter(Boolean)
      .forEach(tag => {
        relationships.push(
          createImplicitRelationship({
            id: `implicit-tag-${tag}-${doc.id}`,
            sourceEntityType: 'tag',
            sourceEntityId: tag,
            targetEntityType: 'document',
            targetEntityId: doc.id,
            relationType: 'includes',
            note: 'Implicit: document tag',
            strength: 1
          })
        );
      });
  });

  return relationships;
}

function createImplicitRelationship({
  id,
  sourceEntityType,
  sourceEntityId,
  targetEntityType,
  targetEntityId,
  relationType = 'contains',
  note = '',
  strength = 1
}) {
  return {
    id,
    sourceEntityType,
    sourceEntityId,
    targetEntityType,
    targetEntityId,
    relationType,
    note,
    strength,
    isImplicit: true
  };
}

async function buildImplicitCollectionRelationships(docs = []) {
  const visibleDocIds =
    new Set(
      docs.map(doc => doc.id)
    );

  const collections =
    await getCollections();

  const relationships = [];

  collections.forEach(collection => {
    const documentIds =
      Array.isArray(collection.documentIds)
        ? collection.documentIds
        : [];

    documentIds.forEach(docId => {
      if (!visibleDocIds.has(docId)) {
        return;
      }

      relationships.push(
        createImplicitRelationship({
          id: `implicit-collection-${collection.id}-${docId}`,
          sourceEntityType: 'collection',
          sourceEntityId: collection.id,
          targetEntityType: 'document',
          targetEntityId: docId,
          relationType: 'contains',
          note: 'Implicit: collection membership',
          strength: 1
        })
      );
    });
  });

  return relationships;
}

function buildImplicitFolderRelationships(docs = []) {
  const relationships = [];

  docs.forEach(doc => {
    const folder =
      getDocumentFolderName(doc);

    if (!folder || folder === 'Unfiled') {
      return;
    }

    relationships.push(
      createImplicitRelationship({
        id: `implicit-folder-${folder}-${doc.id}`,
        sourceEntityType: 'folder',
        sourceEntityId: folder,
        targetEntityType: 'document',
        targetEntityId: doc.id,
        relationType: 'contains',
        note: 'Implicit: folder membership',
        strength: 1
      })
    );
  });

  return relationships;
}

function preserveSelectValue(select, callback) {
  if (!select) return;

  const previous =
    select.value;

  callback();

  const hasPrevious =
    Array.from(select.options).some(option => {
      return option.value === previous;
    });

  if (hasPrevious) {
    select.value = previous;
  }
}

function populateOutlinerFolderFilter(docs = []) {
  if (!els.outlinerFolderFilterSelect) return;

  preserveSelectValue(els.outlinerFolderFilterSelect, () => {
    els.outlinerFolderFilterSelect.innerHTML =
      '<option value="">All Folders</option>';

    const folders =
      getFolderNamesFromDocuments(docs);

    folders.forEach(folder => {
      const option =
        document.createElement('option');

      option.value = folder;
      option.textContent = folder;

      els.outlinerFolderFilterSelect.appendChild(option);
    });
  });
}

function getStatusSortRank(status = '') {
  const normalized =
    normalizeStatus(status);

  const order = [
    '',
    'Idea',
    'Drafting',
    'Needs Rewrite',
    'Revising',
    'Final',
    'Reference'
  ];

  const index =
    order.indexOf(normalized);

  return index >= 0
    ? index
    : 999;
}

function sortDocumentsForOutliner(list = []) {
  const sortMode =
    els.outlinerSortSelect?.value || 'structure';

  if (sortMode === 'structure') {
    return sortDocumentsForDisplay(list);
  }

  return list.slice().sort((a, b) => {
    if (sortMode === 'title-asc') {
      return String(a.title || '').localeCompare(String(b.title || ''));
    }

    if (sortMode === 'title-desc') {
      return String(b.title || '').localeCompare(String(a.title || ''));
    }

    if (sortMode === 'words-desc') {
      return Number(b.wordCount || 0) - Number(a.wordCount || 0);
    }

    if (sortMode === 'words-asc') {
      return Number(a.wordCount || 0) - Number(b.wordCount || 0);
    }

    if (sortMode === 'status') {
      return (
        getStatusSortRank(getDocStatusForDisplay(a)) -
        getStatusSortRank(getDocStatusForDisplay(b))
      );
    }

    if (sortMode === 'updated-desc') {
      return Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
    }

    if (sortMode === 'updated-asc') {
      return Number(a.updatedAt || 0) - Number(b.updatedAt || 0);
    }

    return 0;
  });
}

function downloadBoardFile(filename, content, type) {
  const blob = new Blob([content], {
    type
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function buildBoardExportHtml(title, board) {
  const safeTitle = escapeHtml(title || 'Board');
  const connectorsSvg = buildBoardExportConnectorsSvg(board);

  const itemsHtml = board.items.map(item => {
    const left = Number(item.x || 0);
    const top = Number(item.y || 0);
    const width = Number(item.width || 240);
    const height = Number(item.height || 140);
    const color = item.color || '#fff8b5';
    const typeLabel = getReadableBoardType(item.type);

    const style = [
      `left:${left}px`,
      `top:${top}px`,
      `width:${width}px`,
      `min-height:${height}px`,
      `background:${color}`,
      `z-index:${Number(item.zIndex || 2)}`
    ].join(';');

    if (item.type === 'person') {
      return `
        <article class="export-board-card export-board-person" style="${style}">
          <div class="export-board-card-head">${escapeHtml(typeLabel)}</div>
          <div class="export-board-card-body">
            <h2>${escapeHtml(item.name || item.title || 'Unnamed Person')}</h2>
            <p class="export-board-role">${escapeHtml(item.role || 'Character')}</p>
            ${
              item.notes
                ? `<p>${escapeHtml(item.notes)}</p>`
                : ''
            }
          </div>
        </article>
      `;
    }

    if (item.type === 'link') {
      const url = normalizeExternalUrl(item.url || '');
      const host = item.docId
        ? 'NaviWriter document'
        : getHostnameFromUrl(url) || 'External link';

      return `
        <article class="export-board-card export-board-link" style="${style}">
          <div class="export-board-card-head">${escapeHtml(typeLabel)}</div>
          <div class="export-board-card-body">
            <h2>${escapeHtml(item.title || 'Untitled Link')}</h2>
            <div class="export-link-preview">
              <div class="export-link-domain">${escapeHtml(host)}</div>
              ${
                item.docId
                  ? `<div class="export-link-url">Linked document: ${escapeHtml(item.title || item.docId)}</div>`
                  : `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url || url)}</a>`
              }
            </div>
          </div>
        </article>
      `;
    }

    if (item.type === 'image') {
      return `
        <article class="export-board-card export-board-image" style="${style}">
          <div class="export-board-card-head">${escapeHtml(typeLabel)}</div>
          <div class="export-board-card-body">
            <h2>${escapeHtml(item.title || 'Image')}</h2>
            ${
              item.src
                ? `<img src="${item.src}" alt="${escapeHtml(item.title || 'Board image')}" />`
                : `<p>No image data.</p>`
            }
          </div>
        </article>
      `;
    }

    return `
      <article class="export-board-card export-board-note" style="${style}">
        <div class="export-board-card-head">${escapeHtml(typeLabel)}</div>
        <div class="export-board-card-body">
          <h2>${escapeHtml(item.title || 'Note')}</h2>
          <p>${escapeHtml(item.text || '')}</p>
        </div>
      </article>
    `;
  }).join('\n');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: #111827;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 32px;
    }

    h1 {
      color: #f8fafc;
      margin: 0 0 18px;
      font-size: 22px;
    }

    .export-board {
      position: relative;
      width: 5000px;
      height: 3500px;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background:
        radial-gradient(circle, rgba(148, 163, 184, 0.26) 1px, transparent 1px),
        #111827;
      background-size: 22px 22px;
    }

    .export-board-connectors {
      position: absolute;
      inset: 0;
      width: 5000px;
      height: 3500px;
      pointer-events: none;
      z-index: 1;
    }

    .export-board-card {
      position: absolute;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.16);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
    }

    .export-board-card-head {
      min-height: 28px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .export-board-card-body {
      padding: 10px 12px 14px;
      font-size: 12px;
      line-height: 1.35;
    }

    .export-board-card-body h2 {
      margin: 0 0 6px;
      font-size: 16px;
      line-height: 1.15;
      color: #831843;
    }

    .export-board-role {
      margin: 0 0 8px;
      color: #9d174d;
      font-weight: 700;
    }

    .export-board-card-body p {
      margin: 0 0 6px;
      white-space: pre-wrap;
    }

    .export-board-image img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: contain;
      border-radius: 10px;
      background: #fff;
    }

    .export-link-preview {
      display: grid;
      gap: 4px;
      padding: 8px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.65);
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .export-link-domain {
      color: #0f172a;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .export-link-url,
    .export-link-preview a {
      color: #1d4ed8;
      font-size: 12px;
      word-break: break-word;
      font-weight: 700;
    }

    .board-connector-label {
      font-size: 12px;
      font-weight: 800;
      fill: #ffffff;
      paint-order: stroke;
      stroke: rgba(0, 0, 0, 0.65);
      stroke-width: 3px;
    }
  </style>
</head>

<body>
  <h1>${safeTitle}</h1>
  <main class="export-board">
    ${connectorsSvg}
    ${itemsHtml}
  </main>
</body>
</html>
  `.trim();
}

function setupSplitResize() {
  const handle =
    els.splitResizeHandle;

  const workspace =
    els.workspace;

  if (!handle || !workspace) return;

  const savedWidth =
    localStorage.getItem('naviwriter-split-pane-width');

  if (savedWidth) {
    workspace.style.setProperty(
      '--split-pane-width',
      savedWidth
    );
  }

  handle.onpointerdown = event => {
    event.preventDefault();

    function move(ev) {
      const rect =
        workspace.getBoundingClientRect();

      const width =
        Math.max(
          280,
          Math.min(680, rect.right - ev.clientX)
        );

      const value =
        `${width}px`;

      workspace.style.setProperty(
        '--split-pane-width',
        value
      );

      localStorage.setItem(
        'naviwriter-split-pane-width',
        value
      );
    }

    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
}

function setupPaneResize() {
  const main = document.querySelector('.main-layout');
  const leftGutter = document.getElementById('leftResize');
  const rightGutter = document.getElementById('rightResize');

  if (!main) return;

  const savedLeft = localStorage.getItem('naviwriter-left-pane-width');
  const savedRight = localStorage.getItem('naviwriter-right-pane-width');

  if (savedLeft) {
    main.style.setProperty('--left-pane-width', savedLeft);
  }

  if (savedRight) {
    main.style.setProperty('--right-pane-width', savedRight);
  }

  if (leftGutter) {
    leftGutter.onpointerdown = event => {
      event.preventDefault();

      function move(ev) {
        const rect = main.getBoundingClientRect();
        const width = Math.max(210, Math.min(460, ev.clientX - rect.left));
        const value = `${width}px`;

        main.style.setProperty('--left-pane-width', value);
        localStorage.setItem('naviwriter-left-pane-width', value);
      }

      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
  }

  if (rightGutter) {
    rightGutter.onpointerdown = event => {
      event.preventDefault();

      function move(ev) {
        const rect = main.getBoundingClientRect();
        const width = Math.max(230, Math.min(520, rect.right - ev.clientX));
        const value = `${width}px`;

        main.style.setProperty('--right-pane-width', value);
        localStorage.setItem('naviwriter-right-pane-width', value);
      }

      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
  }
}

async function handleExportProjectBackup() {
  if (!window.NaviExport?.exportProjectBackup) {
    showAppNotice(
  'Project backup export is not available.',
);
    return;
  }

  await saveCurrentDocument({
    manual: true
  });

  await NaviExport.exportProjectBackup();

  NaviEditor.setSaveStatus('Project backup exported');
}

function handleImportProjectBackupClick() {
  if (!els.projectBackupInput) {
    
    showAppNotice(
  'Backup import input is missing.',
);
    return;
  }

  els.projectBackupInput.click();
}

async function handleImportProjectBackupFile(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    const text = await file.text();

    const replaceExisting = confirm(
      'Import backup?\n\nOK = replace current documents\nCancel = import as copies'
    );

    const result = await NaviExport.importProjectBackupText(
      text,
      {
        replaceExisting
      }
    );

    await loadDocuments();

    if (result.documents && result.documents.length) {
      await openDocument(result.documents[0].id);
    }

    NaviEditor.setSaveStatus(
      `Imported ${result.documents.length} document${result.documents.length === 1 ? '' : 's'}`
    );
  } catch (error) {
    console.error(error);
    await showAppError(
  error?.message || String(error),
  'Project backup import failed.'
);
    NaviEditor.setSaveStatus('Backup import error');
  } finally {
    event.target.value = '';
  }
}

function supportsFileSystemAccess() {
  return (
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}


  
  async function
renderRelationshipPanel(
  docId
) {

  await renderOutgoingRelationships(
    docId
  );

  await renderBacklinks(
    docId
  );

}

async function verifyFileHandlePermission(fileHandle, readWrite = false) {
  if (!fileHandle) return false;

  const options = readWrite
    ? { mode: 'readwrite' }
    : { mode: 'read' };

  if (typeof fileHandle.queryPermission === 'function') {
    const existingPermission =
      await fileHandle.queryPermission(options);

    if (existingPermission === 'granted') {
      return true;
    }
  }

  if (typeof fileHandle.requestPermission === 'function') {
    const requestedPermission =
      await fileHandle.requestPermission(options);

    return requestedPermission === 'granted';
  }

  return true;
}

async function getCurrentProjectPayload() {
  if (!window.NaviExport?.createProjectFilePayload) {
    throw new Error('Project file tools are not available.');
  }

  await saveCurrentDocument({
    manual: true
  });

  return await NaviExport.createProjectFilePayload();
}

async function writeProjectPayloadToHandle(fileHandle, payload) {
  const hasPermission =
    await verifyFileHandlePermission(fileHandle, true);

  if (!hasPermission) {
    throw new Error('Permission to write project file was denied.');
  }

  const writable = await fileHandle.createWritable();

  await writable.write(
    JSON.stringify(payload, null, 2)
  );

  await writable.close();
}

function setProjectFileStatus(message) {
  if (window.NaviEditor?.setSaveStatus) {
    NaviEditor.setSaveStatus(message);
  }

  if (!els.projectFileStatus) return;

  els.projectFileStatus.textContent = message;

  els.projectFileStatus.classList.remove(
    'linked',
    'warning',
    'error'
  );

  const lower = String(message || '').toLowerCase();

  if (
    lower.includes('saved') ||
    lower.includes('opened') ||
    lower.includes('linked')
  ) {
    els.projectFileStatus.classList.add('linked');
    return;
  }

  if (
    lower.includes('downloaded') ||
    lower.includes('needs') ||
    lower.includes('preview')
  ) {
    els.projectFileStatus.classList.add('warning');
    return;
  }

  if (
    lower.includes('error') ||
    lower.includes('failed')
  ) {
    els.projectFileStatus.classList.add('error');
  }
}

async function handleSaveProjectAs() {
  if (!supportsFileSystemAccess()) {
    await downloadProjectFileFallback();
    return;
  }

  try {
    const date = new Date()
      .toISOString()
      .slice(0, 10);

    const fileHandle = await window.showSaveFilePicker({
      suggestedName: `NaviWriter Project ${date}.nwproj`,
      types: [
        {
          description: 'NaviWriter Project File',
          accept: {
            'application/json': [
              '.nwproj',
              '.nwp',
              '.json'
            ]
          }
        }
      ]
    });

    const payload = await getCurrentProjectPayload();

    await writeProjectPayloadToHandle(fileHandle, payload);

    currentProjectFileHandle = fileHandle;
    currentProjectFileName = fileHandle.name || 'NaviWriter Project';

    setProjectFileStatus(`Project saved: ${currentProjectFileName}`);
    scheduleProjectFileAutosave();
  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }

    if (isFilePickerBlockedError(error)) {
      console.warn(
        'File picker blocked by embedded/cross-origin environment. Falling back to download.',
        error
      );

      await downloadProjectFileFallback();
      
  

      showAppNotice(
  'Because you are in preview mode, automatic saving is off. A .nwproj file was downloaded to your computer to keep your work safe. \n\n' +
  'To easily update your original file, open your project in a Chromium browser (Chrome, Edge, or Brave) and select Save Project File.'
);

      return;
    }

    
    console.error('Save Project As failed:', error);
    await showAppError(
  error?.message || String(error),
  'Save Project As failed.'
);
    setProjectFileStatus('Project save error');
  }
}

async function handleSaveProjectFile() {
  if (!currentProjectFileHandle) {
    await handleSaveProjectAs();
    return;
  }

  try {
    const payload = await getCurrentProjectPayload();

    await writeProjectPayloadToHandle(
      currentProjectFileHandle,
      payload
    );

    setProjectFileStatus(
      `Project file saved${currentProjectFileName ? `: ${currentProjectFileName}` : ''}`
    );
  } catch (error) {
    console.error('Project file save failed:', error);

    if (isFilePickerBlockedError(error)) {
      await downloadProjectFileFallback();

      showAppNotice(
        'This environment blocked direct project-file saving.\n\n' +
        'NaviWriter downloaded an updated project file instead.'
      );

      return;
    }

    const retry = confirm(
      `Project file save failed:\n\n${error?.message || error}\n\nSave as a new project file?`
    );

    if (retry) {
      currentProjectFileHandle = null;
      currentProjectFileName = '';
      await handleSaveProjectAs();
    } else {
      setProjectFileStatus('Project file save error');
    }
  }
}

async function handleOpenProjectFile() {
  if (!supportsFileSystemAccess()) {
    handleImportProjectBackupClick();
    return;
  }

  try {
    const [fileHandle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'NaviWriter Project File',
          accept: {
            'application/json': [
              '.nwproj',
              '.nwp',
              '.json'
            ]
          }
        }
      ]
    });

    const hasPermission =
      await verifyFileHandlePermission(fileHandle, false);

    if (!hasPermission) {
      throw new Error('Permission to read project file was denied.');
    }

    const file = await fileHandle.getFile();
    const text = await file.text();

    const replaceExisting = confirm(
      'Open project file?\n\nOK = replace current documents\nCancel = import as copies'
    );

    const result = await NaviExport.importProjectBackupText(
      text,
      {
        replaceExisting
      }
    );

    await loadDocuments();

    if (result.documents && result.documents.length) {
      await openDocument(result.documents[0].id);
    }

    if (replaceExisting) {
      currentProjectFileHandle = fileHandle;
      currentProjectFileName = file.name || 'NaviWriter Project';
      scheduleProjectFileAutosave();
    } else {
      currentProjectFileHandle = null;
      currentProjectFileName = '';
      scheduleProjectFileAutosave();
    }

    setProjectFileStatus(
      replaceExisting
        ? `Project opened: ${currentProjectFileName}`
        : `Imported ${result.documents.length} document${result.documents.length === 1 ? '' : 's'} as copies`
    );
  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }

    if (isFilePickerBlockedError(error)) {
      console.warn(
        'File picker blocked by embedded/cross-origin environment. Falling back to file input.',
        error
      );

      showAppNotice(
        'This preview environment blocks direct project-file opening.\n\n' +
        'Use the normal Import Project Backup picker instead.'
      );

      handleImportProjectBackupClick();
      return;
    }

    console.error('Open Project File failed:', error);
    await showAppError(
  error?.message || String(error),
  'Open Project File failed.'
);
    setProjectFileStatus('Project open error');
  }
}

function isFilePickerBlockedError(error) {
  const message = String(error?.message || error || '');

  return (
    error?.name === 'SecurityError' ||
    message.includes('Cross origin sub frames') ||
    message.includes('not allowed to show a file picker') ||
    message.includes('blocked by the same-origin policy')
  );
}

function loadProjectFileAutosaveSetting() {
  const saved =
    localStorage.getItem(PROJECT_FILE_AUTOSAVE_KEY) || '0';

  if (els.projectAutosaveSelect) {
    els.projectAutosaveSelect.value = saved;
  }
}

function getProjectFileAutosaveMinutes() {
  return Number(els.projectAutosaveSelect?.value || 0) || 0;
}

function scheduleProjectFileAutosave() {
  clearInterval(projectFileAutosaveTimer);
  projectFileAutosaveTimer = null;

  const minutes = getProjectFileAutosaveMinutes();

  localStorage.setItem(
    PROJECT_FILE_AUTOSAVE_KEY,
    String(minutes)
  );

  if (!minutes) {
    return;
  }

  if (!currentProjectFileHandle) {
    setProjectFileStatus('Auto project save needs Save Project As in a supported browser.');
    return;
  }

  projectFileAutosaveTimer = setInterval(() => {
    handleSaveProjectFile();
  }, minutes * 60 * 1000);
}

function handleProjectAutosaveChange() {
  const minutes = getProjectFileAutosaveMinutes();

  localStorage.setItem(
    PROJECT_FILE_AUTOSAVE_KEY,
    String(minutes)
  );

  if (minutes && !currentProjectFileHandle) {
    showAppNotice('Use Save Project As first before enabling automatic project file saves.');
  }

  scheduleProjectFileAutosave();
}

async function downloadProjectFileFallback() {
  const payload = await getCurrentProjectPayload();

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {
      type: 'application/json'
    }
  );

  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = `NaviWriter Project ${date}.nwproj`;
  link.click();

  URL.revokeObjectURL(link.href);

  setProjectFileStatus('Project file downloaded');
}

async function initApp() {
  cacheElements();
  loadProjectFileAutosaveSetting();
  setupCollapsibleInspectorSections();
  setupBoardPanning();
  setupPaneResize();
  setupSplitResize();
  setupDraggableFindPanel();
  loadCollapsedDocIds();

  await NaviStorage.openDatabase();

  NaviThemes.initThemes();

  NaviEditor.initEditor({
  onChange: () => {

    if (isLoadingDocument) {
      return;
    }

    scheduleAutosave();
  }
});

  setFocusMode(document.body.classList.contains('focus-mode'));

  setupEvents();


  await openInitialDocument();

  updateRepeatedTextAnalysis();
  renderHeadingCounts();
  updateLongGoalDisplay();

  NaviEditor.updateCounts();
}

window.addEventListener('DOMContentLoaded', () => {
  initApp().catch(error => {
    console.error(error);
    showAppNotice('NaviWriter failed to start. Check the console for details.');
  });
});