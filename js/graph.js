/**
 * Phase 2: Core Graph Physics & Rendering Engine
 * Handles Cytoscape.js initialization, layouts, and visual interactions.
 */

window.GraphEngine = {
    cy: null,
    
    // Relationship color dictionary matching styles.css
    colors: {
        ally: '#4caf50',
        authority: '#ff9800',
        family: '#2196f3',
        rival: '#f44336',
        romantic: '#e91e63',
        other: '#9e9e9e'
    },

    /**
     * Initializes or updates the canvas with new JSON data.
     * @param {Object} data - Requires arrays: { nodes: [], edges: [] }
     */
    init: function(data) {
        const container = document.getElementById('cy');
        
        // Destroy existing instance if switching maps
        if (this.cy) {
            this.cy.destroy();
        }

        this.cy = cytoscape({
            container: container,
            elements: data,
            
            style: [
                // Default Node Styling
                {
                    selector: 'node',
                    style: {
                        'width': 60,
                        'height': 60,
                        'background-color': '#e2e8f0',
                        'background-image': 'data(image)', // Base64 string from data
                        'background-fit': 'cover',
                        'border-width': 3,
                        'border-color': '#ffffff',
                        'label': 'data(abbr)', // In-circle abbreviation
                        'color': '#ffffff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '20px',
                        'font-weight': 'bold',
                        'text-outline-width': 2,
                        'text-outline-color': '#4a6fa5',
                        'transition-property': 'opacity, border-color',
                        'transition-duration': '0.3s'
                    }
                },
                // Default Edge Styling
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': function(ele) {
                            return window.GraphEngine.colors[ele.data('type')] || window.GraphEngine.colors['other'];
                        },
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': '10px',
                        'color': '#555',
                        'text-background-color': '#ffffff',
                        'text-background-opacity': 1,
                        'text-background-padding': '3px',
                        'text-background-shape': 'roundrectangle',
                        'text-border-color': '#ccc',
                        'text-border-width': 1,
                        'text-border-opacity': 1,
                        'transition-property': 'opacity',
                        'transition-duration': '0.3s'
                    }
                },
                // Interaction State: Faded
                {
                    selector: '.faded',
                    style: {
                        'opacity': 0.1
                    }
                },
                // Interaction State: Highlighted (Selected node)
                {
                    selector: '.selected-node',
                    style: {
                        'border-color': '#ff4d4f',
                        'border-width': 4,
                        'z-index': 100
                    }
                }
            ],
            
            layout: this.getLayoutConfig()
        });

        this.bindEvents();
        this.updateStatsCounters();
    },

    /**
     * Returns the physics configuration, reading the current slider value.
     */
    getLayoutConfig: function() {
        const sliderVal = document.getElementById('edge-slider').value;
        return {
            name: 'cose',
            idealEdgeLength: function(edge) { return parseInt(sliderVal); },
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 30,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: function(node) { return 400000; },
            edgeElasticity: function(edge) { return 100; },
            nestingFactor: 5
        };
    },

    /**
     * Re-runs the physics engine when slider is adjusted.
     */
    refreshLayout: function() {
        if (!this.cy) return;
        const layout = this.cy.layout(this.getLayoutConfig());
        layout.run();
    },

    /**
     * Binds UI and canvas interaction events.
     */
    bindEvents: function() {
        const _this = this;

        // 1. Focus & Fade Logic on Node Click
        this.cy.on('tap', 'node', function(evt) {
            const node = evt.target;
            
            // Reset states
            _this.cy.elements().removeClass('faded selected-node');
            
            // Get immediate neighbors
            const connectedEdges = node.connectedEdges();
            const connectedNodes = connectedEdges.connectedNodes();
            
            // Fade everything else
            const others = _this.cy.elements().not(connectedNodes).not(node);
            others.addClass('faded');
            
            // Highlight selected
            node.addClass('selected-node');

            // Dispatch custom event to tell the sidebar to open this character (Phase 3)
            document.dispatchEvent(new CustomEvent('nodeSelected', { detail: node.data() }));
        });

        // 2. Clear Selection on Background Click
        this.cy.on('tap', function(evt) {
            if (evt.target === _this.cy) {
                _this.clearSelection();
            }
        });
        
        // Bind UI Clear Button
        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.clearSelection();
        });

        // 3. Bind Relationship Length Slider
        // Using 'change' instead of 'input' prevents physics engine lag while dragging
        document.getElementById('edge-slider').addEventListener('change', () => {
            _this.refreshLayout();
        });
    },

    /**
     * Restores graph to default view and notifies sidebar.
     */
    clearSelection: function() {
        if (!this.cy) return;
        this.cy.elements().removeClass('faded selected-node');
        document.dispatchEvent(new CustomEvent('selectionCleared'));
    },

    /**
     * Updates the top-left UI counter.
     */
    updateStatsCounters: function() {
        if (!this.cy) return;
        const nodes = this.cy.nodes().length;
        const edges = this.cy.edges().length;
        document.getElementById('stats-counter').textContent = `${nodes} characters, ${edges} relationships`;
    }
};
