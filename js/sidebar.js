/**
 * Phase 3: Sidebar Controls & Image Drag-and-Drop
 * Handles character editing, relationship management, and Base64 avatar conversion.
 */

window.SidebarEngine = {
    selectedNodeId: null,
    base64Image: null,

    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        // Panels
        this.sidebarContent = document.getElementById('sidebar-content');
        this.sidebarEmpty = document.getElementById('sidebar-empty');
        
        // Character Info Header
        this.headerAvatar = document.getElementById('sidebar-avatar');
        this.headerName = document.getElementById('sidebar-name');
        this.headerArchetype = document.getElementById('sidebar-archetype');
        
        // Form Inputs
        this.editOverview = document.getElementById('edit-overview');
        this.editAbbr = document.getElementById('edit-abbr');
        this.editRole = document.getElementById('edit-role');
        
        // Image Drop Zone
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        
        // Link Management
        this.connectedList = document.getElementById('connected-list');
        this.linkTarget = document.getElementById('link-target');
        this.linkType = document.getElementById('link-type');
        this.linkLabel = document.getElementById('link-label');
        
        // Buttons
        this.btnSave = document.getElementById('btn-save-character');
        this.btnDelete = document.getElementById('btn-delete-character');
        this.btnAddLink = document.getElementById('btn-add-link');
        this.btnNewChar = document.getElementById('btn-new-character');
    },

    bindEvents: function() {
        const _this = this;

        // Listen for graph selection events from Phase 2
        document.addEventListener('nodeSelected', (e) => this.populateSidebar(e.detail));
        document.addEventListener('selectionCleared', () => this.clearSidebar());

        // File Drag & Drop Logic for Avatar
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.style.backgroundColor = 'var(--secondary-color)';
        });
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.style.backgroundColor = '#fafafa';
        });
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.style.backgroundColor = '#fafafa';
            if (e.dataTransfer.files.length) {
                this.handleImageUpload(e.dataTransfer.files[0]);
            }
        });
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // Add New Character
        this.btnNewChar.addEventListener('click', () => this.createNewCharacter());

        // Save Character Updates
        this.btnSave.addEventListener('click', () => this.saveCharacter());

        // Delete Character
        this.btnDelete.addEventListener('click', () => this.deleteCharacter());

        // Add/Update Link
        this.btnAddLink.addEventListener('click', () => this.saveLink());
    },

    populateSidebar: function(nodeData) {
        this.selectedNodeId = nodeData.id;
        
        // Toggle Panel Visibility
        this.sidebarEmpty.classList.add('hidden');
        this.sidebarContent.classList.remove('hidden');

        // Populate Header Data
        this.headerName.textContent = nodeData.name || 'Unnamed Character';
        this.headerArchetype.textContent = nodeData.role || 'No Tag';
        
        // Render Base64 Image if present
        if (nodeData.image) {
            this.headerAvatar.src = nodeData.image;
            this.headerAvatar.style.display = 'block';
            this.base64Image = nodeData.image;
        } else {
            this.headerAvatar.style.display = 'none';
            this.base64Image = null;
        }

        // Populate Input Fields
        this.editOverview.value = nodeData.overview || '';
        this.editAbbr.value = nodeData.abbr || '';
        this.editRole.value = nodeData.role || '';

        this.populateLinkDropdowns();
        this.populateConnectedList();
    },

    clearSidebar: function() {
        this.selectedNodeId = null;
        this.base64Image = null;
        this.sidebarContent.classList.add('hidden');
        this.sidebarEmpty.classList.remove('hidden');
    },

    handleImageUpload: function(file) {
        if (!file.type.match('image.*')) {
            alert('Please upload a valid image file.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.base64Image = e.target.result;
            this.headerAvatar.src = this.base64Image;
            this.headerAvatar.style.display = 'block';
        };
        // Convert image to Base64 data string
        reader.readAsDataURL(file);
    },

    createNewCharacter: function() {
        const newId = 'node_' + Date.now();
        const newNodeData = {
            group: 'nodes',
            data: {
                id: newId,
                name: 'New Character',
                abbr: 'NEW',
                role: 'Tag',
                overview: '',
                image: ''
            },
            position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        };
        
        window.GraphEngine.cy.add(newNodeData);
        
        // Simulate a click on the newly created node to open it in the sidebar
        const newNode = window.GraphEngine.cy.getElementById(newId);
        newNode.emit('tap');
        window.GraphEngine.updateStatsCounters();
    },

    saveCharacter: function() {
        if (!this.selectedNodeId) return;
        
        const node = window.GraphEngine.cy.getElementById(this.selectedNodeId);
        
        // Optional prompt to update the full name inline (to save space in the sidebar UI)
        const currentName = node.data('name') || 'Unnamed Character';
        const updatedName = prompt("Update full character name:", currentName);
        
        if (updatedName !== null) {
            node.data({
                name: updatedName,
                abbr: this.editAbbr.value,
                role: this.editRole.value,
                overview: this.editOverview.value,
                image: this.base64Image
            });

            // Re-populate to reflect changes instantly
            this.populateSidebar(node.data());
        }
    },

    deleteCharacter: function() {
        if (!this.selectedNodeId) return;
        
        if (confirm('Delete this character and permanently sever all their connections?')) {
            window.GraphEngine.cy.getElementById(this.selectedNodeId).remove();
            this.clearSidebar();
            window.GraphEngine.updateStatsCounters();
        }
    },

    populateLinkDropdowns: function() {
        this.linkTarget.innerHTML = '<option value="">-- Select Target --</option>';
        
        // Pull all active nodes from the physics engine
        const nodes = window.GraphEngine.cy.nodes();
        nodes.forEach(node => {
            // Prevent linking a character to themselves
            if (node.id() !== this.selectedNodeId) {
                const option = document.createElement('option');
                option.value = node.id();
                option.textContent = node.data('name') || node.data('abbr');
                this.linkTarget.appendChild(option);
            }
        });
    },
    
    populateConnectedList: function() {
        this.connectedList.innerHTML = '';
        if (!this.selectedNodeId) return;
        
        const node = window.GraphEngine.cy.getElementById(this.selectedNodeId);
        const edges = node.connectedEdges();
        
        edges.forEach(edge => {
            const sourceNode = edge.source();
            const targetNode = edge.target();
            
            // Determine the "other" character in this bidirectional relationship
            const otherNode = sourceNode.id() === this.selectedNodeId ? targetNode : sourceNode;
            
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="dot color-${edge.data('type')}"></span> 
                ${otherNode.data('name')} <em>(${edge.data('label') || edge.data('type')})</em>
                <button class="remove-link-btn" data-edge-id="${edge.id()}" style="float:right; border:none; background:none; cursor:pointer; font-size:16px; color:var(--danger-color);">&times;</button>
            `;
            this.connectedList.appendChild(li);
        });

        // Bind delete events for individual links
        document.querySelectorAll('.remove-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const edgeId = e.target.getAttribute('data-edge-id');
                window.GraphEngine.cy.getElementById(edgeId).remove();
                this.populateConnectedList();
                window.GraphEngine.updateStatsCounters();
            });
        });
    },

    saveLink: function() {
        if (!this.selectedNodeId) return;
        
        const targetId = this.linkTarget.value;
        const type = this.linkType.value;
        const label = this.linkLabel.value;

        if (!targetId) {
            alert('Please select a target character from the dropdown.');
            return;
        }

        // Generate unique edge ID
        const newEdgeId = `edge_${this.selectedNodeId}_${targetId}_${Date.now()}`;
        
        window.GraphEngine.cy.add({
            group: 'edges',
            data: {
                id: newEdgeId,
                source: this.selectedNodeId,
                target: targetId,
                type: type,
                label: label
            }
        });

        this.linkLabel.value = ''; // Reset custom label input
        this.populateConnectedList();
        window.GraphEngine.updateStatsCounters();
    }
};

// Initialize Sidebar Logic once DOM loads
document.addEventListener('DOMContentLoaded', () => {
    if(window.SidebarEngine) {
        window.SidebarEngine.init();
    }
});
