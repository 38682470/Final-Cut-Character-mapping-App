document.addEventListener('DOMContentLoaded', () => {
    let cy;
    let selectedNodeId = null;

    // Pre-loaded with starter characters so your canvas isn't blank
    let graphData = {
        nodes: [
            { id: 'c_1', name: 'Alexander Sterling', abbr: 'AS', role: 'Protagonist', overview: 'The central figure of the narrative.', image: '' },
            { id: 'c_2', name: 'Elena Vance', abbr: 'EV', role: 'Ally', overview: 'A trusted confidante and strategist.', image: '' },
            { id: 'c_3', name: 'Lord Morvath', abbr: 'LM', role: 'Antagonist', overview: 'Seeking control over the syndicate.', image: '' }
        ],
        edges: [
            { id: 'e_1_2', source: 'c_1', target: 'c_2', type: 'Ally/Friend', label: 'Trusted Partners' },
            { id: 'e_1_3', source: 'c_1', target: 'c_3', type: 'Rival/Enemy', label: 'Bitter Rivals' }
        ]
    };

    function initCy() {
        cy = cytoscape({
            container: document.getElementById('cy'),
            boxSelectionEnabled: false,
            autounselectify: false,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(name)',
                        'text-valign': 'bottom',
                        'text-margin-y': 8,
                        'font-size': '12px',
                        'font-weight': '600',
                        'color': '#334155',
                        'background-color': '#cbd5e1',
                        'width': 50,
                        'height': 50,
                        'background-fit': 'cover',
                        'background-clip': 'none',
                        'border-width': 2,
                        'border-color': '#ffffff'
                    }
                },
                {
                    selector: 'node[image]',
                    style: {
                        'background-image': 'data(image)'
                    }
                },
                {
                    selector: 'node:selected',
                    style: {
                        'border-color': '#2563eb',
                        'border-width': 4
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#94a3b8',
                        'target-arrow-color': '#94a3b8',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': '10px',
                        'text-rotation': 'autorotate',
                        'color': '#64748b'
                    }
                },
                {
                    selector: '.faded',
                    style: {
                        'opacity': 0.25
                    }
                },
                {
                    selector: '.highlighted',
                    style: {
                        'opacity': 1
                    }
                }
            ],
            elements: []
        });

        cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            selectedNodeId = node.id();
            renderPanel();
            highlightConnections(selectedNodeId);
        });

        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                selectedNodeId = null;
                renderPanel();
                cy.elements().removeClass('highlighted faded');
            }
        });

        updateGraph();
    }

    function updateGraph() {
        cy.elements().remove();
        
        const elementsToAdd = [
            ...graphData.nodes.map(n => ({ group: 'nodes', data: n })),
            ...graphData.edges.map(e => ({ group: 'edges', data: e }))
        ];

        cy.add(elementsToAdd);

        const edgeLength = parseInt(document.getElementById('edgeLengthSlider').value, 10);
        cy.layout({
            name: 'cose',
            idealEdgeLength: edgeLength,
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 50,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 400000,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
        }).run();

        updateStats();
    }

    function updateStats() {
        const charCount = graphData.nodes.length;
        const relCount = graphData.edges.length;
        document.getElementById('statsLabel').textContent = `${charCount} characters, ${relCount} relationships`;
    }

    function highlightConnections(nodeId) {
        cy.elements().removeClass('highlighted faded');
        const node = cy.$('#' + nodeId);
        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();

        cy.elements().addClass('faded');
        node.removeClass('faded').addClass('highlighted');
        connectedEdges.removeClass('faded').addClass('highlighted');
        connectedNodes.removeClass('faded').addClass('highlighted');
    }

    function renderPanel() {
        const panel = document.getElementById('panelContent');

        if (!selectedNodeId) {
            panel.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <p class="text-sm">Select a character or click below to add a new one.</p>
                    <button id="addCharacterBtn" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium shadow transition">+ Add Character</button>
                </div>
            `;
            document.getElementById('addCharacterBtn').addEventListener('click', addNewCharacter);
            return;
        }

        const character = graphData.nodes.find(n => n.id === selectedNodeId);
        if (!character) return;

        const relationships = graphData.edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
        const otherNodes = graphData.nodes.filter(n => n.id !== selectedNodeId);

        let relHtml = relationships.map(r => {
            const targetId = r.source === selectedNodeId ? r.target : r.source;
            const targetNode = graphData.nodes.find(n => n.id === targetId);
            return `
                <div class="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-200 mb-2 text-sm">
                    <div>
                        <span class="font-semibold text-gray-800">${targetNode ? targetNode.name : 'Unknown'}</span>
                        <span class="text-xs text-gray-500 block">(${r.type}: ${r.label || ''})</span>
                    </div>
                    <button data-edge-id="${r.id}" class="delete-edge-btn text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1">Remove</button>
                </div>
            `;
        }).join('');

        panel.innerHTML = `
            <div class="space-y-6">
                <div class="flex items-center space-x-4">
                    <div class="w-16 h-16 rounded-full bg-gray-200 border-2 border-white shadow overflow-hidden flex items-center justify-center flex-shrink-0">
                        ${character.image ? `<img src="${character.image}" class="w-full h-full object-cover">` : `<span class="text-lg font-bold text-gray-500">${character.abbr || character.name[0]}</span>`}
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-gray-800">${character.name}</h2>
                        <button id="editNameBtn" class="text-xs text-blue-600 hover:underline">Edit Name</button>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Character Overview</label>
                    <textarea id="charOverview" rows="3" class="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">${character.overview || ''}</textarea>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Avatar Image URL or Data-URI</label>
                    <input type="text" id="charImage" value="${character.image || ''}" placeholder="Paste image link or upload below" class="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2">
                    <input type="file" id="imageUploadInput" accept="image/*" class="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                </div>

                <div class="flex space-x-3">
                    <button id="saveCharBtn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg font-medium shadow transition">Update Character</button>
                    <button id="deleteCharBtn" class="bg-red-50 hover:bg-red-100 text-red-600 text-sm px-4 py-2 rounded-lg font-medium transition">Delete</button>
                </div>

                <hr class="border-gray-200">

                <div>
                    <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Connected Relationships</h3>
                    <div class="space-y-2 mb-4">${relHtml || '<p class="text-xs text-gray-400 italic">No relationships yet.</p>'}</div>

                    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                        <h4 class="text-xs font-bold text-gray-700 uppercase">Add New Link</h4>
                        <select id="relTarget" class="w-full text-sm border border-gray-300 rounded-lg p-2 bg-white">
                            <option value="">-- Select Target Character --</option>
                            ${otherNodes.map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
                        </select>
                        <select id="relType" class="w-full text-sm border border-gray-300 rounded-lg p-2 bg-white">
                            <option value="Family">Family</option>
                            <option value="Romantic">Romantic</option>
                            <option value="Authority/Power">Authority/Power</option>
                            <option value="Ally/Friend">Ally/Friend</option>
                            <option value="Rival/Enemy">Rival/Enemy</option>
                            <option value="Other">Other</option>
                        </select>
                        <input type="text" id="relCustomLabel" placeholder="Custom Label (e.g. Mentor & Mentee)" class="w-full text-sm border border-gray-300 rounded-lg p-2 bg-white">
                        <button id="addRelBtn" class="w-full bg-slate-800 hover:bg-slate-900 text-white text-sm py-2 rounded-lg font-medium transition">Add / Update Link</button>
                    </div>
                </div>
            </div>
        `;

        bindPanelEvents(character);
    }

    function bindPanelEvents(character) {
        document.getElementById('saveCharBtn').addEventListener('click', () => {
            character.overview = document.getElementById('charOverview').value;
            character.image = document.getElementById('charImage').value;
            updateGraph();
            renderPanel();
        });

        document.getElementById('imageUploadInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(uploadEvent) {
                    document.getElementById('charImage').value = uploadEvent.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('editNameBtn').addEventListener('click', () => {
            const newName = prompt("Enter new full character name:", character.name);
            if (newName) {
                character.name = newName;
                character.abbr = newName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                updateGraph();
                renderPanel();
            }
        });

        document.getElementById('deleteCharBtn').addEventListener('click', () => {
            if (confirm(`Delete ${character.name}?`)) {
                graphData.nodes = graphData.nodes.filter(n => n.id !== character.id);
                graphData.edges = graphData.edges.filter(e => e.source !== character.id && e.target !== character.id);
                selectedNodeId = null;
                updateGraph();
                renderPanel();
            }
        });

        document.getElementById('addRelBtn').addEventListener('click', () => {
            const targetId = document.getElementById('relTarget').value;
            const type = document.getElementById('relType').value;
            const label = document.getElementById('relCustomLabel').value;

            if (!targetId) {
                alert('Please select a target character.');
                return;
            }

            const edgeId = `e_${selectedNodeId}_${targetId}`;
            graphData.edges = graphData.edges.filter(e => !(e.source === selectedNodeId && e.target === targetId) && !(e.source === targetId && e.target === selectedNodeId));

            graphData.edges.push({
                id: edgeId,
                source: selectedNodeId,
                target: targetId,
                type: type,
                label: label || type
            });

            updateGraph();
            renderPanel();
        });

        document.querySelectorAll('.delete-edge-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const edgeId = e.target.getAttribute('data-edge-id');
                graphData.edges = graphData.edges.filter(e => e.id !== edgeId);
                updateGraph();
                renderPanel();
            });
        });
    }

    function addNewCharacter() {
        const name = prompt("Enter character name:");
        if (!name) return;

        const id = 'c_' + Math.random().toString(36).substring(2, 9);
        const abbr = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

        graphData.nodes.push({
            id: id,
            name: name,
            abbr: abbr,
            role: 'Character',
            overview: '',
            image: ''
        });

        selectedNodeId = id;
        updateGraph();
        renderPanel();
    }

    document.getElementById('addCharacterInitialBtn')?.addEventListener('click', addNewCharacter);

    document.getElementById('edgeLengthSlider').addEventListener('input', (e) => {
        if (cy) {
            const edgeLength = parseInt(e.target.value, 10);
            cy.layout({
                name: 'cose',
                idealEdgeLength: edgeLength,
                animate: true
            }).run();
        }
    });

    document.getElementById('clearSelectionBtn').addEventListener('click', () => {
        selectedNodeId = null;
        renderPanel();
        if (cy) cy.elements().removeClass('highlighted faded');
    });

    document.getElementById('exportJsonBtn').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graphData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "relationship-map-export.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    document.getElementById('importJsonInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsed = JSON.parse(event.target.result);
                
                if (Array.isArray(parsed)) {
                    graphData.nodes = parsed.filter(item => item.group === 'nodes').map(i => i.data);
                    graphData.edges = parsed.filter(item => item.group === 'edges').map(i => i.data);
                } else if (parsed.nodes && parsed.edges) {
                    graphData.nodes = parsed.nodes;
                    graphData.edges = parsed.edges;
                } else if (parsed.characters && parsed.relationships) {
                    graphData.nodes = parsed.characters;
                    graphData.edges = parsed.relationships;
                } else {
                    throw new Error("Unrecognized JSON format.");
                }

                updateGraph();
                selectedNodeId = null;
                renderPanel();
                alert("JSON imported successfully!");
            } catch (err) {
                alert("Failed to parse JSON file: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    initCy();
});
