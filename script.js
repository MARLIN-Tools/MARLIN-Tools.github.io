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
        
        // Set grid template (all cells 40px square)
        puzzleGrid.style.gridTemplateColumns = `repeat(${width + 2}, 40px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${height + 2}, 40px)`;
        
        // Generate cells. The overall grid has extra rows and columns for headers.
        for (let row = 0; row < height + 2; row++) {
            for (let col = 0; col < width + 2; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Headers: the upper left 2x2 block
                if ((row === 0 && col < 2) || (col === 0 && row < 2)) {
                    cell.classList.add('header');
                    cell.textContent = '.';
                }
                // Oil header: top row (row 0), excluding first two cells – oil count per COL.
                else if (row === 0 && col > 1) {
                    cell.classList.add('oil-header');
                    // Add red style via CSS class or inline style if needed
                    cell.style.backgroundColor = '#fdd';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Oil header: first column (col 0) for rows after the header – oil count per ROW.
                else if (col === 0 && row > 1) {
                    cell.classList.add('oil-header');
                    cell.style.backgroundColor = '#fdd';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Water header: bottom row (last row), excluding first two cells – water count per COL.
                else if (row === height + 1 && col > 1) {
                    cell.classList.add('water-header');
                    cell.style.backgroundColor = '#ddf';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Water header: last column (col = width + 1) for rows after header – water count per ROW.
                else if (col === width + 1 && row > 1) {
                    cell.classList.add('water-header');
                    cell.style.backgroundColor = '#ddf';
                    const input = createInputElement();
                    cell.appendChild(input);
                }
                // Aquarium cells (the main puzzle area)
                else if (row > 1 && row <= height && col > 1 && col <= width) {
                    const input = createInputElement();
                    cell.appendChild(input);
                    cell.classList.add('aquarium-cell');
                    
                    // Add a thicker top and left border for the first row/column of the aquarium cells 
                    // (i.e. at the border between headers and aquarium area)
                    if (row === 2) {
                        cell.style.borderTop = '3px solid black';
                    }
                    if (col === 2) {
                        cell.style.borderLeft = '3px solid black';
                    }
                }
                // For any leftover cell (like header cells in position (1,x) or (x,1))
                else {
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
        
        // Validate input to allow only numbers. (Empty string will later be treated as zero.)
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
            
            // Determine grid size, excluding the header rows/columns.
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
                    
                    // Update cell value:
                    // If the value is not ".", set the input value or the textContent.
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
        
        // Helper to safely parse a number input (empty or invalid becomes 0)
        function safeParse(val) {
            const num = parseInt(val);
            return isNaN(num) ? 0 : num;
        }
        
        const cells = puzzleGrid.querySelectorAll('.cell');
        
        // Oil header: top row, columns > 1 for oil counts per column
        for (let col = 2; col < width + 2; col++) {
            const cellIndex = col;
            const input = cells[cellIndex].querySelector('input');
            puzzle.oilCol[col - 2] = safeParse(input ? input.value : '');
        }
        
        // Oil header: first column for rows > 1 for oil counts per row
        for (let row = 2; row < height + 2; row++) {
            const cellIndex = row * (width + 2);
            const input = cells[cellIndex].querySelector('input');
            puzzle.oilRow[row - 2] = safeParse(input ? input.value : '');
        }
        
        // Water header: bottom row for columns > 1, water counts per column
        for (let col = 2; col < width + 2; col++) {
            const cellIndex = (height + 1) * (width + 2) + col;
            const input = cells[cellIndex].querySelector('input');
            puzzle.waterCol[col - 2] = safeParse(input ? input.value : '');
        }
        
        // Water header: last column for rows > 1, water counts per row
        for (let row = 2; row < height + 2; row++) {
            const cellIndex = row * (width + 2) + width + 1;
            const input = cells[cellIndex].querySelector('input');
            puzzle.waterRow[row - 2] = safeParse(input ? input.value : '');
        }
        
        // Initialize aquariums grid
        puzzle.aquariums = Array(height).fill().map(() => Array(width).fill(0));
        
        // Aquarium numbers: interior cells from row 2 to height+1 and col 2 to width+1
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const cellIndex = (row + 2) * (width + 2) + (col + 2);
                const input = cells[cellIndex].querySelector('input');
                puzzle.aquariums[row][col] = safeParse(input ? input.value : '');
            }
        }
        
        return puzzle;
    }

    function validatePuzzleInput(puzzle) {
        // Check that at least one aquarium cell has a positive number
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
        
        // Check that each aquarium (each positive id) forms a contiguous region.
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
        
        // Validate that oil+water counts do not exceed number of cells in each row/column.
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
        
        // Find the first cell for this aquarium id
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
        
        // DFS to search for connected cells
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
        
        // Count all cells that belong to this aquarium id
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
        // Create solution structure
        const solution = {
            width: puzzle.width,
            height: puzzle.height,
            cells: Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0)) // 0: empty, 1: water, 2: oil
        };
        
        // Identify aquariums and their cells
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
        
        // Use constraint satisfaction first.
        const solveResult = solveConstraints(puzzle, aquariums);
        
        if (solveResult.solved) {
            solution.cells = solveResult.grid;
            solution.isValid = true;
            return solution;
        }
        
        // If constraints alone couldn’t solve, try a heuristic fill per aquarium.
        const sortedAquariums = Object.entries(aquariums).map(([id, cells]) => {
            const bottomRow = Math.max(...cells.map(cell => cell.row));
            return { id: parseInt(id), cells, bottomRow };
        }).sort((a, b) => b.bottomRow - a.bottomRow);
        
        for (const aquarium of sortedAquariums) {
            const { cells } = aquarium;
            // Group cells by row.
            const rowGroups = {};
            cells.forEach(cell => {
                if (!rowGroups[cell.row]) {
                    rowGroups[cell.row] = [];
                }
                rowGroups[cell.row].push(cell);
            });
            // Get rows from bottom to top.
            const rows = Object.keys(rowGroups).map(Number).sort((a, b) => b - a);
            
            // Try to fill bottom rows with water.
            let filledWater = false;
            for (const row of rows) {
                const rowCells = rowGroups[row];
                let canAddWater = true;
                for (const cell of rowCells) {
                    if (solution.cells[cell.row][cell.col] !== 0 ||
                        countRowType(solution.cells, cell.row, 1) >= puzzle.waterRow[cell.row] ||
                        countColType(solution.cells, cell.col, 1) >= puzzle.waterCol[cell.col]) {
                        canAddWater = false;
                        break;
                    }
                }
                if (canAddWater) {
                    rowCells.forEach(cell => {
                        solution.cells[cell.row][cell.col] = 1;
                    });
                    filledWater = true;
                } else {
                    break;
                }
            }
            
            // Then try to fill above those rows with oil.
            if (filledWater) {
                let waterTopRow = rows.find(row =>
                    rowGroups[row].some(cell => solution.cells[cell.row][cell.col] === 1)
                );
                for (const row of rows) {
                    if (row >= waterTopRow) continue;
                    const rowCells = rowGroups[row];
                    let canAddOil = true;
                    for (const cell of rowCells) {
                        if (solution.cells[cell.row][cell.col] !== 0 ||
                            countRowType(solution.cells, cell.row, 2) >= puzzle.oilRow[cell.row] ||
                            countColType(solution.cells, cell.col, 2) >= puzzle.oilCol[cell.col]) {
                            canAddOil = false;
                            break;
                        }
                    }
                    if (canAddOil) {
                        rowCells.forEach(cell => {
                            solution.cells[cell.row][cell.col] = 2;
                        });
                    } else {
                        break;
                    }
                }
            }
        }
        
        // Validate the final solution.
        const isValid = validateSolution(solution, puzzle);
        solution.isValid = isValid;
        return solution;
    }
    
    function solveConstraints(puzzle, aquariums) {
        const grid = Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0));
        let changed = true;
        let iterations = 0;
        const maxIterations = 100;
        
        function canFillCell(row, col, type) {
            if (type === 1 && countRowType(grid, row, 1) >= puzzle.waterRow[row]) return false;
            if (type === 1 && countColType(grid, col, 1) >= puzzle.waterCol[col]) return false;
            if (type === 2 && countRowType(grid, row, 2) >= puzzle.oilRow[row]) return false;
            if (type === 2 && countColType(grid, col, 2) >= puzzle.oilCol[col]) return false;
            return true;
        }
        
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            for (const id in aquariums) {
                const cells = aquariums[id];
                const rowGroups = {};
                cells.forEach(cell => {
                    if (!rowGroups[cell.row]) rowGroups[cell.row] = [];
                    rowGroups[cell.row].push(cell);
                });
                const sortedRows = Object.keys(rowGroups).map(Number).sort((a, b) => b - a);
                
                let hasWater = cells.some(cell => grid[cell.row][cell.col] === 1);
                let hasOil = cells.some(cell => grid[cell.row][cell.col] === 2);
                
                if (hasOil && !hasWater) {
                    const oilRows = cells.filter(cell => grid[cell.row][cell.col] === 2).map(cell => cell.row);
                    const lowestOilRow = Math.max(...oilRows);
                    for (const row of sortedRows) {
                        if (row <= lowestOilRow) continue;
                        const rowCells = rowGroups[row];
                        let canFillRowWithWater = true;
                        for (const cell of rowCells) {
                            if (grid[cell.row][cell.col] !== 0 || !canFillCell(cell.row, cell.col, 1)) {
                                canFillRowWithWater = false;
                                break;
                            }
                        }
                        if (canFillRowWithWater) {
                            rowCells.forEach(cell => {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                            });
                            hasWater = true;
                            break;
                        }
                    }
                    if (!hasWater) {
                        return { solved: false, grid };
                    }
                }
                
                for (let row = 0; row < puzzle.height; row++) {
                    const rowCellsInAquarium = cells.filter(cell => cell.row === row);
                    if (rowCellsInAquarium.length === 0) continue;
                    
                    const remainingWaterInRow = puzzle.waterRow[row] - countRowType(grid, row, 1);
                    const emptyRowCells = rowCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    if (remainingWaterInRow === emptyRowCells.length) {
                        emptyRowCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 1)) {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                            }
                        });
                    }
                    
                    const remainingOilInRow = puzzle.oilRow[row] - countRowType(grid, row, 2);
                    const updatedEmptyRowCells = rowCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    if (remainingOilInRow === updatedEmptyRowCells.length) {
                        updatedEmptyRowCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 2)) {
                                grid[cell.row][cell.col] = 2;
                                changed = true;
                            }
                        });
                    }
                }
                
                for (let col = 0; col < puzzle.width; col++) {
                    const colCellsInAquarium = cells.filter(cell => cell.col === col);
                    if (colCellsInAquarium.length === 0) continue;
                    
                    const remainingWaterInCol = puzzle.waterCol[col] - countColType(grid, col, 1);
                    const emptyColCells = colCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    if (remainingWaterInCol === emptyColCells.length) {
                        emptyColCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 1)) {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                            }
                        });
                    }
                    
                    const remainingOilInCol = puzzle.oilCol[col] - countColType(grid, col, 2);
                    const updatedEmptyColCells = colCellsInAquarium.filter(cell => grid[cell.row][cell.col] === 0);
                    if (remainingOilInCol === updatedEmptyColCells.length) {
                        updatedEmptyColCells.forEach(cell => {
                            if (canFillCell(cell.row, cell.col, 2)) {
                                grid[cell.row][cell.col] = 2;
                                changed = true;
                            }
                        });
                    }
                }
                
                if (hasWater) {
                    const waterRows = cells.filter(cell => grid[cell.row][cell.col] === 1).map(cell => cell.row);
                    const topmostWaterRow = Math.min(...waterRows);
                    for (const cell of cells) {
                        if (cell.row >= topmostWaterRow && grid[cell.row][cell.col] === 0) {
                            if (canFillCell(cell.row, cell.col, 1)) {
                                grid[cell.row][cell.col] = 1;
                                changed = true;
                            }
                        }
                    }
                }
                if (hasOil) {
                    const oilRows = cells.filter(cell => grid[cell.row][cell.col] === 2).map(cell => cell.row);
                    const topmostOilRow = Math.min(...oilRows);
                    const lowestOilRow = Math.max(...oilRows);
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
        
        let isSolved = true;
        for (let row = 0; row < puzzle.height; row++) {
            if (countRowType(grid, row, 1) !== puzzle.waterRow[row] ||
                countRowType(grid, row, 2) !== puzzle.oilRow[row]) {
                isSolved = false;
                break;
            }
        }
        if (isSolved) {
            for (let col = 0; col < puzzle.width; col++) {
                if (countColType(grid, col, 1) !== puzzle.waterCol[col] ||
                    countColType(grid, col, 2) !== puzzle.oilCol[col]) {
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
        
        for (let row = 0; row < height; row++) {
            const waterCount = countRowType(cells, row, 1);
            const oilCount = countRowType(cells, row, 2);
            if (waterCount !== puzzle.waterRow[row] || oilCount !== puzzle.oilRow[row]) {
                valid = false;
                break;
            }
        }
        
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

    // Function to display solution in the solutionGrid element
    function displaySolution(solution) {
        solutionGrid.innerHTML = '';
        solutionGrid.style.gridTemplateColumns = `repeat(${solution.width}, 40px)`;
        solutionGrid.style.gridTemplateRows = `repeat(${solution.height}, 40px)`;
        
        for (let row = 0; row < solution.height; row++) {
            for (let col = 0; col < solution.width; col++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell solution-cell';
                
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
        const cells = puzzleGrid.querySelectorAll('.cell');
        cells.forEach(cell => {
            const input = cell.querySelector('input');
            if (input) {
                input.value = '';
            } else {
                cell.textContent = '.';
            }
        });
        solutionGrid.innerHTML = '';
        solutionStatus.innerHTML = '';
        solutionStatus.className = '';
        solvePuzzleButton.disabled = false;
    }
});