/**
 * Phase 4: Robust Import/Export Data Pipeline & Cloud Sync
 * Handles IndexedDB local auto-saving, GitHub Gist syncing, and JSON file parsing.
 */

window.DataEngine = {
    db: null,
    isDirty: false,
    
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.initIndexedDB().then(() => {
            this.loadLocalSnapshot();
        });

        // "Dirty State" warning before closing tab
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    },

    cacheDOM: function() {
        // Toolbar Buttons
        this.btnExport = document.getElementById('export-json-btn');
        this.btnImportModal = document.getElementById('import-json-btn');
        this.btnGithubModal = document.getElementById('github-config-btn');
        
        // Modals
        this.modalImport = document.getElementById('modal-import');
        this.modalGithub = document.getElementById('modal-github');
        this.closeButtons = document.querySelectorAll('.close-modal');
        
        // Import Tab Elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.importText = document.getElementById('import-json-text');
        this.btnImportText = document.getElementById('btn-import-text');
        this.fileDropZone = document.getElementById('json-drop-zone');
        this.fileInput = document.getElementById('json-file-input');
        this.importError = document.getElementById('import-error');

        // GitHub Elements
        this.ghToken = document.getElementById('gh-token');
        this.ghGistId = document.getElementById('gh-gist-id');
        this.btnSaveGithub = document.getElementById('btn-save-github');
    },

    bindEvents: function() {
        const _this = this;

        // Modal Toggles
        this.btnImportModal.addEventListener('click', () => this.modalImport.classList.remove('hidden'));
        this.btnGithubModal.addEventListener('click', () => {
            this.ghToken.value = localStorage.getItem('gh_pat') || '';
            this.ghGistId.value = localStorage.getItem('gh_gist_id') || '';
            this.modalGithub.classList.remove('hidden');
        });

        this.closeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').classList.add('hidden');
                _this.importError.classList.add('hidden');
            });
        });

        // Tab Switching Logic
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.tabBtns.forEach(b => b.classList.remove('active'));
                this.tabContents.forEach(c => c.classList.add('hidden'));
                
                const targetTab = e.target.getAttribute('data-tab');
                e.target.classList.add('active');
                document.getElementById(targetTab).classList.remove('hidden');
                this.importError.classList.add('hidden');
            });
        });

        // 1. Direct JSON Paste Import
        this.btnImportText.addEventListener('click', () => {
            this.processImportData(this.importText.value);
        });

        // 2. File Upload Import (Drag & Drop / Click)
        this.fileDropZone.addEventListener('click', () => this.fileInput.click());
        this.fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDropZone.style.backgroundColor = 'var(--secondary-color)';
        });
        this.fileDropZone.addEventListener('dragleave', () => {
            this.fileDropZone.style.backgroundColor = '#fafafa';
        });
        this.fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDropZone.style.backgroundColor = '#fafafa';
            if (e.dataTransfer.files.length) this.readJsonFile(e.dataTransfer.files[0]);
        });
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.readJsonFile(e.target.files[0]);
        });

        // 3. Export JSON Button
        this.btnExport.addEventListener('click', () => this.exportJson());

        // 4. GitHub Sync
        this.btnSaveGithub.addEventListener('click', () => this.syncToGithub());

        // Bind Auto-Save Trigger (Listens for graph changes)
        setInterval(() => {
            if (this.isDirty && window.GraphEngine.cy) {
                this.saveLocalSnapshot();
            }
        }, 3000); // Debounced auto-save every 3 seconds if changes exist
    },

    // ==========================================
    // SCHEMA VALIDATION & PARSING
    // ==========================================

    readJsonFile: function(file) {
        if (!file.name.endsWith('.json')) {
            this.showError('Please select a valid .json file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            this.processImportData(e.target.result);
            this.fileInput.value = ''; // Reset input
        };
        reader.readAsText(file);
    },

    processImportData: function(rawText) {
        try {
            const data = JSON.parse(rawText);
            
            // Strict Schema Validation: Cytoscape accepts a flat array of elements or an object with nodes/edges
            const isValid = Array.isArray(data) || (data.nodes !== undefined);
            
            if (!isValid) {
                throw new Error("Missing required 'nodes' array.");
            }

            // Validation passed. Hand over to Graph Engine.
            window.GraphEngine.init(data);
            this.modalImport.classList.add('hidden');
            this.importError.classList.add('hidden');
            this.importText.value = '';
            this.isDirty = true;
            this.saveLocalSnapshot(); // Overwrite IndexedDB with new map
            
        } catch (error) {
            this.showError("Invalid JSON structure: " + error.message);
        }
    },

    showError: function(message) {
        this.importError.textContent = message;
        this.importError.classList.remove('hidden');
    },

    exportJson: function() {
        if (!window.GraphEngine.cy) return;
        
        const exportData = window.GraphEngine.cy.elements().jsons();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "character_map_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        this.isDirty = false; // Reset dirty state after successful manual export
    },

    // ==========================================
    // INDEXEDDB LOCAL STORAGE (High Capacity)
    // ==========================================

    initIndexedDB: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CharacterMapDB', 1);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('maps')) {
                    db.createObjectStore('maps', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    },

    saveLocalSnapshot: function() {
        if (!this.db || !window.GraphEngine.cy) return;
        
        const currentData = window.GraphEngine.cy.elements().jsons();
        const transaction = this.db.transaction(['maps'], 'readwrite');
        const store = transaction.objectStore('maps');
        
        store.put({ id: 'activeMap', data: currentData, timestamp: Date.now() });
        
        transaction.oncomplete = () => {
            this.isDirty = false;
        };
    },

    loadLocalSnapshot: function() {
        if (!this.db) return;
        
        const transaction = this.db.transaction(['maps'], 'readonly');
        const store = transaction.objectStore('maps');
        const request = store.get('activeMap');
        
        request.onsuccess = (e) => {
            if (e.target.result && e.target.result.data) {
                window.GraphEngine.init(e.target.result.data);
            } else {
                // Initialize empty canvas if no local save exists
                window.GraphEngine.init([]);
            }
        };
    },

    // ==========================================
    // GITHUB CLOUD SYNC
    // ==========================================

    syncToGithub: function() {
        const pat = this.ghToken.value.trim();
        const gistId = this.ghGistId.value.trim();
        
        if (!pat) {
            alert('A Personal Access Token is required for Cloud Sync.');
            return;
        }
        
        // Save credentials locally (localStorage is safe for strings like PAT on a personal device)
        localStorage.setItem('gh_pat', pat);
        localStorage.setItem('gh_gist_id', gistId);
        
        this.btnSaveGithub.textContent = "Syncing...";
        this.btnSaveGithub.disabled = true;

        const mapData = window.GraphEngine.cy.elements().jsons();
        const payload = {
            description: "Character Mapping Studio Backup",
            public: false,
            files: {
                "character-map.json": {
                    content: JSON.stringify(mapData, null, 2)
                }
            }
        };

        const headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": `token ${pat}`
        };

        // Determine if updating existing Gist or creating new one
        const url = gistId ? `https://api.github.com/gists/${gistId}` : `https://api.github.com/gists`;
        const method = gistId ? 'PATCH' : 'POST';

        fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.id) {
                localStorage.setItem('gh_gist_id', data.id);
                this.ghGistId.value = data.id;
                this.modalGithub.classList.add('hidden');
                this.isDirty = false;
                alert('Map successfully synced to GitHub Gist!');
            } else {
                throw new Error(data.message || "Failed to sync.");
            }
        })
        .catch(error => {
            alert("GitHub Sync Error: " + error.message);
        })
        .finally(() => {
            this.btnSaveGithub.textContent = "Save & Sync";
            this.btnSaveGithub.disabled = false;
        });
    }
};

// Initialize Data Engine and mark state dirty when graph changes
document.addEventListener('DOMContentLoaded', () => {
    if (window.DataEngine) {
        window.DataEngine.init();
        
        // Listen for user actions to trigger 'dirty' state for Auto-Save and Tab Close Warning
        document.addEventListener('nodeSelected', () => window.DataEngine.isDirty = true);
        
        // Listen to Cytoscape internal events for dragging/adding
        setTimeout(() => {
            if (window.GraphEngine && window.GraphEngine.cy) {
                window.GraphEngine.cy.on('add remove position data', () => {
                    window.DataEngine.isDirty = true;
                });
            }
        }, 1000); // Slight delay to ensure cy is initialized
    }
});
