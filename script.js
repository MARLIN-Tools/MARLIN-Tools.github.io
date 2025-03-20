document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const gridWidthInput = document.getElementById('grid-width');
    const gridHeightInput = document.getElementById('grid-height');
    const generateGridButton = document.getElementById('generate-grid');
    const puzzleGrid = document.getElementById('puzzle-grid');
    const puzzleText = document.getElementById('puzzle-text');
    const parseTextButton = document.getElementById('parse-text');
    const solvePuzzleButton = document.getElementById('solve-puzzle');
    const resetPuzzleButton = document.getElementById('reset-puzzle');
    const solutionGrid = document.getElementById('solution-grid');
    const solutionStatus = document.getElementById('solution-status');
    const tabButtons = document.querySelectorAll('.tab-button');
    
    // State variables
    let currentPuzzle = null;
    let puzzleWidth = 10;
    let puzzleHeight = 10;

    // Initialize by generating the default grid
    generateGrid(puzzleWidth, puzzleHeight);

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            document.querySelectorAll('.input-method').forEach(method => {
                method.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Event listeners
    generateGridButton.addEventListener('click', function() {
        puzzleWidth = parseInt(gridWidthInput.value) || 10;
        puzzleHeight = parseInt(gridHeightInput.value) || 10;
        
        // Validate input
        if (puzzleWidth < 3 || puzzleWidth > 20 || puzzleHeight < 3 || puzzleHeight > 20) {
            alert('Grid dimensions must be between 3 and 20');
            return;
        }
        
        generateGrid(puzzleWidth, puzzleHeight);
    });

    parseTextButton.addEventListener('click', function() {
        parsePuzzleText(puzzleText.value);
    });

    solvePuzzleButton.addEventListener('click', function() {
        try {
            currentPuzzle = collectGridData();
            if (validatePuzzleInput(currentPuzzle)) {
                solvePuzzleButton.disabled = true;
                solutionStatus.innerHTML = 'Solving puzzle...';
                solutionStatus.className = '';
                
                // Use setTimeout to allow the UI to update before heavy computation
                setTimeout(() => {
                    const solution = solvePuzzle(currentPuzzle);
                    displaySolution(solution);
                    solvePuzzleButton.disabled = false;
                }, 50);
            }
        } catch (error) {
            solutionStatus.innerHTML = `<strong>Error:</strong> ${error.message}`;
            solutionStatus.className = 'error';
            console.error(error);
            solvePuzzleButton.disabled = false;
        }
    });

    resetPuzzleButton.addEventListener('click', function() {
        resetPuzzle();
    });

    // Functions
    function generateGrid(width, height) {
        // Clear any existing grid
        puzzleGrid.innerHTML = '';
        
        // Set grid template
        puzzleGrid.style.gridTemplateColumns = `repeat(${width + 2}, 40px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${height + 2}, 40px)`;
        
        // Generate cells
        for (let row = 0; row < height + 2; row++) {
            for (let col = 0; col < width + 2; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Headers
                if (row === 0 && col === 0 || row === 0 && col === 1 || row === 1 && col === 0 || row === 1 && col === 1) {
                    cell.className = 'cell header';
                    cell.textContent = '.';
                }
                // Oil row headers (top row)
                else if (row === 0 && col > 1) {
                    cell.className = 'cell oil-header';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Oil column headers (left column)
                else if (col === 0 && row > 1) {
                    cell.className = 'cell oil-header';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Water row headers (bottom row)
                else if (row === height + 1 && col > 1) {
                    cell.className = 'cell water-header';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Water column headers (right column)
                else if (col === width + 1 && row > 1) {
                    cell.className = 'cell water-header';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Grid cells for aquarium numbers
                else if (row > 1 && col > 1 && row <= height && col <= width) {
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                
                puzzleGrid.appendChild(cell);
            }
        }
        
        // Enable solve button
        solvePuzzleButton.disabled = false;
    }

    function createInputElement() {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 3;
        
        // Validate input to allow only numbers
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
        
        return input;
    }

    function parsePuzzleText(text) {
        try {
            // Split by lines and filter out empty lines
            const lines = text.trim().split('\n').filter(line => line.trim() !== '');
            
            if (lines.length < 3) {
                throw new Error('Not enough data rows in input');
            }
            
            // Split the first line to determine width
            const firstLineValues = lines[0].trim().split(/\s+/);
            
            if (firstLineValues.length < 3) {
                throw new Error('Not enough columns in input');
            }
            
            // Determine grid size
            const height = lines.length - 2; // Minus the two header rows
            const width = firstLineValues.length - 2; // Minus the two header columns
            
            // Validate dimensions
            if (width < 3 || width > 20 || height < 3 || height > 20) {
                throw new Error('Grid dimensions must be between 3 and 20');
            }
            
            // Reset grid size inputs
            gridWidthInput.value = width;
            gridHeightInput.value = height;
            
            // Generate new grid
            generateGrid(width, height);
            
            // Fill the grid with values
            let cells = puzzleGrid.querySelectorAll('.cell');
            
            lines.forEach((line, rowIndex) => {
                // Split by whitespace (tabs or spaces)
                const values = line.trim().split(/\s+/);
                
                if (values.length !== width + 2) {
                    throw new Error(`Row ${rowIndex + 1} has incorrect number of columns`);
                }
                
                values.forEach((value, colIndex) => {
                    // Calculate the index in the flattened cells array
                    const cellIndex = rowIndex * (width + 2) + colIndex;
                    const cell = cells[cellIndex];
                    
                    // Update cell value
                    if (cell) {
                        const input = cell.querySelector('input');
                        if (input) {
                            input.value = value !== '.' ? value : '';
                        } else if (value !== '.') {
                            cell.textContent = value;
                        }
                    }
                });
            });
            
            // Switch to grid view
            tabButtons.forEach(btn => {
                if (btn.getAttribute('data-target') === 'grid-input') {
                    btn.click();
                }
            });
            
            // Enable solve button
            solvePuzzleButton.disabled = false;
            
            // Clear any error messages
            solutionStatus.innerHTML = '';
            solutionStatus.className = '';
            
        } catch (error) {
            solutionStatus.innerHTML = `<strong>Error parsing input:</strong> ${error.message}`;
            solutionStatus.className = 'error';
            console.error(error);
        }
    }

    function collectGridData() {
        const width = parseInt(gridWidthInput.value);
        const height = parseInt(gridHeightInput.value);
        
        // Create data structure
        const puzzle = {
            width,
            height,
            oilRow: Array(height).fill(0),     // Oil indicators for rows
            oilCol: Array(width).fill(0),      // Oil indicators for columns
            waterRow: Array(height).fill(0),   // Water indicators for rows
            waterCol: Array(width).fill(0),    // Water indicators for columns
            aquariums: []                      // Aquarium mapping
        };
        
        // Collect data from grid
        const cells = puzzleGrid.querySelectorAll('.cell');
        
        // Oil row headers (top row)
        for (let col = 2; col < width + 2; col++) {
            const cellIndex = col;
            const input = cells[cellIndex].querySelector('input');
            puzzle.oilCol[col - 2] = parseInt(input?.value || 0);
        }
        
        // Oil column headers (left column)
        for (let row = 2; row < height + 2; row++) {
            const cellIndex = row * (width + 2);
            const input = cells[cellIndex].querySelector('input');
            puzzle.oilRow[row - 2] = parseInt(input?.value || 0);
        }
        
        // Water row headers (bottom row)
        for (let col = 2; col < width + 2; col++) {
            const cellIndex = (height + 1) * (width + 2) + col;
            const input = cells[cellIndex].querySelector('input');
            puzzle.waterCol[col - 2] = parseInt(input?.value || 0);
        }
        
        // Water column headers (right column)
        for (let row = 2; row < height + 2; row++) {
            const cellIndex = row * (width + 2) + width + 1;
            const input = cells[cellIndex].querySelector('input');
            puzzle.waterRow[row - 2] = parseInt(input?.value || 0);
        }
        
        // Initialize aquariums grid
        puzzle.aquariums = Array(height).fill().map(() => Array(width).fill(0));
        
        // Aquarium numbers
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const cellIndex = (row + 2) * (width + 2) + (col + 2);
                const input = cells[cellIndex].querySelector('input');
                puzzle.aquariums[row][col] = parseInt(input?.value || 0);
            }
        }
        
        return puzzle;
    }

    function validatePuzzleInput(puzzle) {
        // Check if there are any aquariums defined
        let hasAquarium = false;
        for (let row = 0; row < puzzle.height; row++) {
            for (let col = 0; col < puzzle.width; col++) {
                if (puzzle.aquariums[row][col] > 0) {
                    hasAquarium = true;
                    break;
                }
            }
            if (hasAquarium) break;
        }
        
        if (!hasAquarium) {
            throw new Error('No aquariums defined in the puzzle');
        }
        
        // Check if aquariums are contiguous
        const aquariumIds = new Set();
        for (let row = 0; row < puzzle.height; row++) {
            for (let col = 0; col < puzzle.width; col++) {
                const id = puzzle.aquariums[row][col];
                if (id > 0) {
                    aquariumIds.add(id);
                }
            }
        }
        
        for (const id of aquariumIds) {
            if (!isAquariumContiguous(puzzle.aquariums, id)) {
                throw new Error(`Aquarium ${id} is not contiguous`);
            }
        }
        
        // Check if constraints are valid
        for (let row = 0; row < puzzle.height; row++) {
            if (puzzle.oilRow[row] + puzzle.waterRow[row] > puzzle.width) {
                throw new Error(`Row ${row + 1} has more oil and water than available cells`);
            }
        }
        
        for (let col = 0; col < puzzle.width; col++) {
            if (puzzle.oilCol[col] + puzzle.waterCol[col] > puzzle.height) {
                throw new Error(`Column ${col + 1} has more oil and water than available cells`);
            }
        }
        
        return true;
    }
    
    function isAquariumContiguous(aquariums, id) {
        const height = aquariums.length;
        const width = aquariums[0].length;
        const visited = Array(height).fill().map(() => Array(width).fill(false));
        let foundCells = 0;
        
        // Find first cell of this aquarium
        let startRow = -1, startCol = -1;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (aquariums[row][col] === id) {
                    startRow = row;
                    startCol = col;
                    break;
                }
            }
            if (startRow !== -1) break;
        }
        
        if (startRow === -1) return true; // No cells with this ID
        
        // DFS to check contiguity
        const stack = [{row: startRow, col: startCol}];
        const directions = [{dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}];
        
        while (stack.length > 0) {
            const {row, col} = stack.pop();
            
            if (row < 0 || row >= height || col < 0 || col >= width || 
                visited[row][col] || aquariums[row][col] !== id) {
                continue;
            }
            
            visited[row][col] = true;
            foundCells++;
            
            for (const {dr, dc} of directions) {
                stack.push({row: row + dr, col: col + dc});
            }
        }
        
        // Count total cells with this ID
        let totalCells = 0;
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (aquariums[row][col] === id) {
                    totalCells++;
                }
            }
        }
        
        return foundCells === totalCells;
    }

    function solvePuzzle(puzzle) {
        // Create solution grid
        const solution = {
            width: puzzle.width,
            height: puzzle.height,
            cells: Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0)) // 0: empty, 1: water, 2: oil
        };
        
        // Step 1: Identify all unique aquariums and their cells
        const aquariums = {};
        for (let row = 0; row < puzzle.height; row++) {
            for (let col = 0; col < puzzle.width; col++) {
                const aquariumId = puzzle.aquariums[row][col];
                if (aquariumId) {
                    if (!aquariums[aquariumId]) {
                        aquariums[aquariumId] = [];
                    }
                    aquariums[aquariumId].push({ row, col });
                }
            }
        }
        
        // First pass: Use constraint satisfaction to determine oil and water placement
        const solveResult = solveConstraints(puzzle, aquariums);
        
        if (solveResult.solved) {
            solution.cells = solveResult.grid;
            solution.isValid = true;
            return solution;
        }
        
        // If constraint satisfaction failed, try a more aggressive approach
        // Step 2: Sort aquariums by bottom row position (to fill from bottom up)
        const sortedAquariums = Object.entries(aquariums).map(([id, cells]) => {
            const bottomRow = Math.max(...cells.map(cell => cell.row));
            return { id: parseInt(id), cells, bottomRow };
        }).sort((a, b) => b.bottomRow - a.bottomRow);
        
        // Step 3: For each aquarium, try to fill with water first, then oil
        for (const aquarium of sortedAquariums) {
            const { id, cells } = aquarium;
            
            // Group cells by row
            const rowGroups = {};
            cells.forEach(cell => {
                if (!rowGroups[cell.row]) {
                    rowGroups[cell.row] = [];
                }
                rowGroups[cell.row].push(cell);
            });
            
            // Sort rows from bottom to top
            const rows = Object.keys(rowGroups).map(Number).sort((a, b) => b - a);
            
            // Try to fill bottom rows with water first
            let filledWater = false;
            for (const row of rows) {
                const rowCells = rowGroups[row];
                
                // Check if we can add water to this row
                let canAddWater = true;
                for (const cell of rowCells) {
                    if (solution.cells[cell.row][cell.col] !== 0) {
                        canAddWater = false;
                        break;
                    }
                    
                    // Check row/column constraints
                    if (countRowType(solution.cells, cell.row, 1) >= puzzle.waterRow[cell.row] ||
                        countColType(solution.cells, cell.col, 1) >= puzzle.waterCol[cell.col]) {
                        canAddWater = false;
                        break;
                    }
                }
                
                if (canAddWater) {
                    // Add water to all cells in this row of the aquarium
                    rowCells.forEach(cell => {
                        solution.cells[cell.row][cell.col] = 1; // Water
                    });
                    filledWater = true;
                } else {
                    break; // Stop filling this aquarium with water
                }
            }
            
            // If we've filled some rows with water, try to add oil on top
            if (filledWater) {
                // Find the last row we filled with water
                let waterTopRow = rows.find(row => 
                    rowGroups[row].some(cell => solution.cells[cell.row][cell.col] === 1)
                );
                
                // Try to fill rows above that with oil
                for (const row of rows) {
                    if (row >= waterTopRow) continue; // Skip rows at or below water level
                    
                    const rowCells = rowGroups[row];
                    
                    // Check if we can add oil to this row
                    let canAddOil = true;
                    for (const cell of rowCells) {
                        if (solution.cells[cell.row][cell.col] !== 0) {
                            canAddOil = false;
                            break;
                        }
                        
                        // Check row/column constraints
                        if (countRowType(solution.cells, cell.row, 2) >= puzzle.oilRow[cell.row] ||
                            countColType(solution.cells, cell.col, 2) >= puzzle.oilCol[cell.col]) {
                            canAddOil = false;
                            break;
                        }
                    }
                    
                    if (canAddOil) {
                        // Add oil to all cells in this row of the aquarium
                        rowCells.forEach(cell => {
                            solution.cells[cell.row][cell.col] = 2; // Oil
                        });
                    } else {
                        break; // Stop filling this aquarium with oil
                    }
                }
            }
        }
        
        // Validate solution
        const isValid = validateSolution(solution, puzzle);
        solution.isValid = isValid;
        
        return solution;
    }
    
    function solveConstraints(puzzle, aquariums) {
        const grid = Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0));
        let changed = true;
        let iterations = 0;
        const maxIterations = 100; // Prevent infinite loops
        
        // Helper function to check if a cell can be filled with a specific type
        function canFillCell(row, col, type) {
            // Check row/column constraints
            if (type === 1 && countRowType(grid, row, 1) >= puzzle.waterRow[row]) return false;
            if (type === 1 && countColType(grid, col, 1) >= puzzle.waterCol[col]) return false;
            if (type === 2 && countRowType(grid, row, 2) >= puzzle.oilRow[row]) return false;
            if (type === 2 && countColType(grid, col, 2) >= puzzle.oilCol[col]) return false;
            
            return true;
        }
        
        // Process aquariums
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            // For each aquarium
            for (const id in aquariums) {
                const cells = aquariums[id];
                
                // Group cells by row
                const rowGroups = {};
                cells.forEach(cell => {
                    if (!rowGroups[cell.row]) {
                        rowGroups[cell.row] = [];
                    }
                    rowGroups[cell.row].push(cell);
                });
                
                // Sort rows from bottom to top
                const sortedRows = Object.keys(rowGroups).map(Number).sort((a, b) => b - a);
                
                // Check if this aquarium already has water or oil
                let hasWater = cells.some(cell => grid[cell.row][cell.col] === 1);
                let hasOil = cells.some(cell => grid[cell.row][cell.col] === 2);
                
                // If aquarium has oil but no water, that's invalid
                if (hasOil && !hasWater) {
                    // Find lowest row with oil
                    const oilRows = cells
                        .filter(cell => grid[cell.row][cell.col] === 2)
                        .map(cell => cell.row);
                    const lowestOilRow = Math.max(...oilRows);
                    
                    // Find first row below this that can hold water
                    for (const row of sortedRows) {
                        if (row <= lowestOilRow) continue; // Only look at rows below oil
                        
                        const rowCells = rowGroups[row];
                        let canFillRowWithWater = true;
                        
                        for (const cell of rowCells) {
                            if (grid[cell.row][cell.col] !== 0 || !canFillCell(cell.row, cell.col, 1)) {
                                canFillRowWithWater = false;
                                break;
                            }
                        }
                        
                        if (canFillRowWithWater) {
                            // Fill this row with water
                            rowCells.forEach(cell => {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                            });
                            hasWater = true;
                            break;
                        }
                    }
                    
                    // If we still can't add water, this puzzle might be unsolvable
                    if (!hasWater) {
                        return { solved: false };
                    }
                }
                
                // Check rows that need to be filled to satisfy constraints
                for (let row = 0; row < puzzle.height; row++) {
                    const rowCellsInAquarium = cells.filter(cell => cell.row === row);
                    if (rowCellsInAquarium.length === 0) continue;
                    
                    // Check water constraints
                    const remainingWaterInRow = puzzle.waterRow[row] - countRowType(grid, row, 1);
                    const emptyRowCells = rowCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    
                    if (remainingWaterInRow === emptyRowCells.length) {
                        // Must fill all empty cells in this row with water
                        emptyRowCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 1)) {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                                hasWater = true;
                            }
                        });
                    }
                    
                    // Check oil constraints
                    const remainingOilInRow = puzzle.oilRow[row] - countRowType(grid, row, 2);
                    const updatedEmptyRowCells = rowCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    
                    if (remainingOilInRow === updatedEmptyRowCells.length) {
                        // Must fill all empty cells in this row with oil
                        updatedEmptyRowCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 2)) {
                                grid[cell.row][cell.col] = 2;
                                changed = true;
                                hasOil = true;
                            }
                        });
                    }
                }
                
                // Similar logic for columns
                for (let col = 0; col < puzzle.width; col++) {
                    const colCellsInAquarium = cells.filter(cell => cell.col === col);
                    if (colCellsInAquarium.length === 0) continue;
                    
                    // Check water constraints
                    const remainingWaterInCol = puzzle.waterCol[col] - countColType(grid, col, 1);
                    const emptyColCells = colCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    
                    if (remainingWaterInCol === emptyColCells.length) {
                        // Must fill all empty cells in this column with water
                        emptyColCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 1)) {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                                hasWater = true;
                            }
                        });
                    }
                    
                    // Check oil constraints
                    const remainingOilInCol = puzzle.oilCol[col] - countColType(grid, col, 2);
                    const updatedEmptyColCells = colCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    
                    if (remainingOilInCol === updatedEmptyColCells.length) {
                        // Must fill all empty cells in this column with oil
                        updatedEmptyColCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 2)) {
                                grid[cell.row][cell.col] = 2;
                                changed = true;
                                hasOil = true;
                            }
                        });
                    }
                }
                
                // If aquarium has water, enforce level water surface
                if (hasWater) {
                    // Find topmost row with water
                    const waterRows = cells
                        .filter(cell => grid[cell.row][cell.col] === 1)
                        .map(cell => cell.row);
                    const topmostWaterRow = Math.min(...waterRows);
                    
                    // All cells in rows below or at topmost water row must be water or filled
                    for (const cell of cells) {
                        if (cell.row >= topmostWaterRow && grid[cell.row][cell.col] === 0) {
                            if (canFillCell(cell.row, cell.col, 1)) {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                            }
                        }
                    }
                }
                
                // If aquarium has oil, enforce level oil surface
                if (hasOil) {
                    // Find topmost row with oil
                    const oilRows = cells
                        .filter(cell => grid[cell.row][cell.col] === 2)
                        .map(cell => cell.row);
                    const topmostOilRow = Math.min(...oilRows);
                    
                    // Find lowest row with oil
                    const lowestOilRow = Math.max(...oilRows);
                    
                    // All cells in rows between topmost and lowest oil row must be oil
                    for (const cell of cells) {
                        if (cell.row >= topmostOilRow && cell.row <= lowestOilRow && grid[cell.row][cell.col] === 0) {
                            if (canFillCell(cell.row, cell.col, 2)) {
                                grid[cell.row][cell.col] = 2;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
        
        // Check if the puzzle is completely solved
        let isSolved = true;
        
        // Check row constraints
        for (let row = 0; row < puzzle.height; row++) {
            const waterCount = countRowType(grid, row, 1);
            const oilCount = countRowType(grid, row, 2);
            
            if (waterCount !== puzzle.waterRow[row] || oilCount !== puzzle.oilRow[row]) {
                isSolved = false;
                break;
            }
        }
        
        // Check column constraints
        if (isSolved) {
            for (let col = 0; col < puzzle.width; col++) {
                const waterCount = countColType(grid, col, 1);
                const oilCount = countColType(grid, col, 2);
                
                if (waterCount !== puzzle.waterCol[col] || oilCount !== puzzle.oilCol[col]) {
                    isSolved = false;
                    break;
                }
            }
        }
        
        return { solved: isSolved, grid };
    }
    
    function countRowType(grid, row, type) {
        return grid[row].filter(cell => cell === type).length;
    }
    
    function countColType(grid, col, type) {
        return grid.map(row => row[col]).filter(cell => cell === type).length;
    }
    
    function validateSolution(solution, puzzle) {
        const { cells, width, height } = solution;
        let valid = true;
        
        // Validate row constraints: water and oil counts must exactly match the puzzle constraints.
        for (let row = 0; row < height; row++) {
            const waterCount = countRowType(cells, row, 1);
            const oilCount = countRowType(cells, row, 2);
            if (waterCount !== puzzle.waterRow[row] || oilCount !== puzzle.oilRow[row]) {
                valid = false;
                break;
            }
        }
        
        // Validate column constraints if the rows are valid so far.
        if (valid) {
            for (let col = 0; col < width; col++) {
                const waterCount = countColType(cells, col, 1);
                const oilCount = countColType(cells, col, 2);
                if (waterCount !== puzzle.waterCol[col] || oilCount !== puzzle.oilCol[col]) {
                    valid = false;
                    break;
                }
            }
        }
        
        return valid;
    }

    // Function to display the solution in the solutionGrid element
    function displaySolution(solution) {
        solutionGrid.innerHTML = '';  // Clear any previous solution
        
        // Set grid template to match solution dimensions
        solutionGrid.style.gridTemplateColumns = `repeat(${solution.width}, 40px)`;
        solutionGrid.style.gridTemplateRows = `repeat(${solution.height}, 40px)`;
        
        for (let row = 0; row < solution.height; row++) {
            for (let col = 0; col < solution.width; col++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell solution-cell';
                
                // Display a symbol or background color based on whether the cell is water (1), oil (2) or empty (0)
                if (solution.cells[row][col] === 1) {
                    cellDiv.textContent = 'W';
                    cellDiv.classList.add('water');
                } else if (solution.cells[row][col] === 2) {
                    cellDiv.textContent = 'O';
                    cellDiv.classList.add('oil');
                } else {
                    cellDiv.textContent = '';
                }
                
                solutionGrid.appendChild(cellDiv);
            }
        }
        
        // Indicate whether the solution is valid
        if (solution.isValid) {
            solutionStatus.innerHTML = '<strong>Solved!</strong>';
            solutionStatus.className = 'success';
        } else {
            solutionStatus.innerHTML = '<strong>Solution does not satisfy all constraints!</strong>';
            solutionStatus.className = 'error';
        }
    }

    // Function to reset the puzzle
    function resetPuzzle() {
        // Clear the grid inputs (but keep the current grid dimensions)
        const cells = puzzleGrid.querySelectorAll('.cell');
        cells.forEach(cell => {
            const input = cell.querySelector('input');
            if (input) {
                input.value = '';
            } else {
                cell.textContent = '.';
            }
        });
        
        // Clear solution display and status message
        solutionGrid.innerHTML = '';
        solutionStatus.innerHTML = '';
        solutionStatus.className = '';
        
        // Enable solve button again if it was disabled
        solvePuzzleButton.disabled = false;
    }

    // The rest of the code (e.g., event listeners for the buttons) remains as it is.
});
