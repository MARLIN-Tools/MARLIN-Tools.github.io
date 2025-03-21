/*
The first two columns and rows are indicators for oil and water in each row/column.
The top row/left column indicate oil (red), while the bottom row/right column indicate water (blue).
Other numbers indicate which aquarium (cell group) each cell belongs to.
Aquariums are contained groups of cells which can hold water and oil.
The water or oil level in any given aquarium will be level horizontally.
In any given aquarium, oil will never be below water in that aquarium.
Every aquarium with oil must also contain water, oil can't exist alone, but water can.
Not all aquariums need to be filled completely, some may even be empty!
*/

document.addEventListener('DOMContentLoaded', function () {
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
    // Default interior dimensions (number of aquarium cells per row/column)
    let puzzleWidth = 10;
    let puzzleHeight = 10;
  
    // Initialize by generating the default grid
    generateGrid(puzzleWidth, puzzleHeight);
  
    // Tab switching (if you have multiple views)
    tabButtons.forEach(button => {
      button.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.input-method').forEach(method => {
          method.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
      });
    });
  
    // Event listeners
    generateGridButton.addEventListener('click', function () {
      // Use the interior grid dimensions entered by the user.
      puzzleWidth = parseInt(gridWidthInput.value) || 10;
      puzzleHeight = parseInt(gridHeightInput.value) || 10;
      if (puzzleWidth < 3 || puzzleWidth > 20 || puzzleHeight < 3 || puzzleHeight > 20) {
        alert('Grid dimensions must be between 3 and 20 (for the aquarium area)');
        return;
      }
      generateGrid(puzzleWidth, puzzleHeight);
    });
  
    parseTextButton.addEventListener('click', function () {
      parsePuzzleText(puzzleText.value);
    });
  
    solvePuzzleButton.addEventListener('click', function () {
      try {
        currentPuzzle = collectGridData();
        if (validatePuzzleInput(currentPuzzle)) {
          solvePuzzleButton.disabled = true;
          solutionStatus.innerHTML = 'Solving puzzle...';
          solutionStatus.className = '';
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
  
    resetPuzzleButton.addEventListener('click', function () {
      resetPuzzle();
    });
  
    // FUNCTIONS
  
    // Here the total grid dimensions include 2 header rows and 2 header columns.
    // The interior (aquarium) region has dimensions: puzzleHeight x puzzleWidth.
    function generateGrid(width, height) {
      puzzleGrid.innerHTML = '';
      // Total columns = interior columns + 2; total rows = interior rows + 2.
      puzzleGrid.style.gridTemplateColumns = `repeat(${width + 2}, 40px)`;
      puzzleGrid.style.gridTemplateRows = `repeat(${height + 2}, 40px)`;
  
      // Loop over every cell in the total grid.
      for (let row = 0; row < height + 2; row++) {
        for (let col = 0; col < width + 2; col++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
  
          // Top-left corner (first two cells in first two rows)
          if (row < 2 && col < 2) {
            cell.classList.add('header');
            cell.textContent = '.';
          }
          // Column header cells: first two rows, but only columns 2 and onward.
          else if (row < 2 && col >= 2) {
            // In row 0: oil headers (red), in row 1: water headers (blue)
            if (row === 0) {
              cell.classList.add('oil-header');
              cell.style.backgroundColor = '#fdd'; // light red
            } else {
              cell.classList.add('water-header');
              cell.style.backgroundColor = '#ddf'; // light blue
            }
            const input = createInputElement();
            cell.appendChild(input);
          }
          // Row header cells: first two columns, but only rows 2 and onward.
          else if (col < 2 && row >= 2) {
            // In col 0: oil header (red), in col 1: water header (blue)
            if (col === 0) {
              cell.classList.add('oil-header');
              cell.style.backgroundColor = '#fdd';
            } else {
              cell.classList.add('water-header');
              cell.style.backgroundColor = '#ddf';
            }
            const input = createInputElement();
            cell.appendChild(input);
          }
          // Aquarium cells: rows ≥ 2 and columns ≥ 2.
          else {
            const input = createInputElement();
            cell.appendChild(input);
            cell.classList.add('aquarium-cell');
            // Add a visual separation between headers and interior cells.
            if (row === 2) {
              cell.style.borderTop = '3px solid black';
            }
            if (col === 2) {
              cell.style.borderLeft = '3px solid black';
            }
          }
          puzzleGrid.appendChild(cell);
        }
      }
      solvePuzzleButton.disabled = false;
    }
  
    function createInputElement() {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 3;
      // Allow only numbers (empty is allowed, later treated as zero)
      input.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
      });
      return input;
    }
  
    // Parse the text representation. Expect each row to have (interior columns + 2) tokens.
    // The first two rows are header rows. The first two tokens in every row are row headers.
    function parsePuzzleText(text) {
      try {
        const lines = text.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length < 3) {
          throw new Error('Not enough data rows in input');
        }
        // Determine dimensions from the first row.
        const firstLineValues = lines[0].trim().split(/\s+/);
        if (firstLineValues.length < 3) {
          throw new Error('Not enough columns in input');
        }
        // The interior width = total columns - 2, and interior height = total rows - 2.
        const width = firstLineValues.length - 2;
        const height = lines.length - 2;
        if (width < 3 || width > 20 || height < 3 || height > 20) {
          throw new Error('Grid dimensions (interior) must be between 3 and 20');
        }
        gridWidthInput.value = width;
        gridHeightInput.value = height;
  
        generateGrid(width, height);
        const cells = puzzleGrid.querySelectorAll('.cell');
        // Process each line of the text.
        lines.forEach((line, rowIndex) => {
          const values = line.trim().split(/\s+/);
          if (values.length !== width + 2) {
            throw new Error(`Row ${rowIndex + 1} has incorrect number of columns`);
          }
          values.forEach((value, colIndex) => {
            const cellIndex = rowIndex * (width + 2) + colIndex;
            const cell = cells[cellIndex];
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
        // Switch view (if you have a grid input tab)
        tabButtons.forEach(btn => {
          if (btn.getAttribute('data-target') === 'grid-input') {
            btn.click();
          }
        });
        solvePuzzleButton.disabled = false;
        solutionStatus.innerHTML = '';
        solutionStatus.className = '';
      } catch (error) {
        solutionStatus.innerHTML = `<strong>Error parsing input:</strong> ${error.message}`;
        solutionStatus.className = 'error';
        console.error(error);
      }
    }
  
    // In collectGridData we now read header values from the first two rows and first two columns.
    function collectGridData() {
      const width = parseInt(gridWidthInput.value);
      const height = parseInt(gridHeightInput.value);
      const puzzle = {
        width,
        height,
        oilCol: Array(width).fill(0), // Column headers from row 0 (oil)
        waterCol: Array(width).fill(0), // Column headers from row 1 (water)
        oilRow: Array(height).fill(0), // Row headers from col0 (oil) for interior rows
        waterRow: Array(height).fill(0), // Row headers from col1 (water)
        aquariums: [] // The aquarium layout (interior cells)
      };
  
      function safeParse(val) {
        const num = parseInt(val);
        return isNaN(num) ? 0 : num;
      }
      const cells = puzzleGrid.querySelectorAll('.cell');
  
      // Column headers: row0, columns from index 2 to width+1.
      for (let col = 2; col < width + 2; col++) {
        const cellIndex = col; // row0
        const input = cells[cellIndex].querySelector('input');
        puzzle.oilCol[col - 2] = safeParse(input ? input.value : '');
      }
      // Column headers: row1 for water counts.
      for (let col = 2; col < width + 2; col++) {
        const cellIndex = (1 * (width + 2)) + col;
        const input = cells[cellIndex].querySelector('input');
        puzzle.waterCol[col - 2] = safeParse(input ? input.value : '');
      }
  
      // Row headers: for rows 2 to (height+1), read first two columns.
      for (let row = 2; row < height + 2; row++) {
        // Oil counts from column 0.
        let cellIndex = row * (width + 2) + 0;
        let input = cells[cellIndex].querySelector('input');
        puzzle.oilRow[row - 2] = safeParse(input ? input.value : '');
        // Water counts from column 1.
        cellIndex = row * (width + 2) + 1;
        input = cells[cellIndex].querySelector('input');
        puzzle.waterRow[row - 2] = safeParse(input ? input.value : '');
      }
  
      // The interior aquarium grid: rows 2...(height+1), columns 2...(width+1).
      puzzle.aquariums = Array(height).fill().map(() => Array(width).fill(0));
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
      // Check that at least one aquarium cell is defined (nonzero).
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
      // Ensure each row’s headers sum up to no more than the number of aquarium cells.
      for (let row = 0; row < puzzle.height; row++) {
        if (puzzle.oilRow[row] + puzzle.waterRow[row] > puzzle.width) {
          throw new Error(
            `Row ${row + 2} has ${puzzle.oilRow[row]} oil and ${puzzle.waterRow[row]} water, exceeding the available ${puzzle.width} cells!`
          );
        }
      }
      for (let col = 0; col < puzzle.width; col++) {
        if (puzzle.oilCol[col] + puzzle.waterCol[col] > puzzle.height) {
          throw new Error(
            `Column ${col + 2} has ${puzzle.oilCol[col]} oil and ${puzzle.waterCol[col]} water, exceeding the available ${puzzle.height} cells!`
          );
        }
      }
      // Also check that each aquarium forms a contiguous region.
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
      return true;
    }
  
    function isAquariumContiguous(aquariums, id) {
      const height = aquariums.length;
      const width = aquariums[0].length;
      const visited = Array(height).fill().map(() => Array(width).fill(false));
      let foundCells = 0;
      let startRow = -1,
        startCol = -1;
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
      if (startRow === -1) return true;
      const stack = [{
        row: startRow,
        col: startCol
      }];
      const directions = [{
        dr: -1,
        dc: 0
      }, {
        dr: 1,
        dc: 0
      }, {
        dr: 0,
        dc: -1
      }, {
        dr: 0,
        dc: 1
      }];
      while (stack.length > 0) {
        const {
          row,
          col
        } = stack.pop();
        if (row < 0 || row >= height || col < 0 || col >= width || visited[row][col] || aquariums[row][col] !== id) {
          continue;
        }
        visited[row][col] = true;
        foundCells++;
        for (const {
            dr,
            dc
          }
          of directions) {
          stack.push({
            row: row + dr,
            col: col + dc
          });
        }
      }
      let totalCells = 0;
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          if (aquariums[row][col] === id) totalCells++;
        }
      }
      return foundCells === totalCells;
    }
  
    function solvePuzzle(puzzle) {
      // Create the solution object up front so it's available everywhere
      const solution = {
        width: puzzle.width,
        height: puzzle.height,
        cells: Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0))
      };
      
      // Organize cells by aquarium ID
      const aquariums = {};
      for (let row = 0; row < puzzle.height; row++) {
        for (let col = 0; col < puzzle.width; col++) {
          const aid = puzzle.aquariums[row][col];
          if (aid) {
            if (!aquariums[aid]) {
              aquariums[aid] = [];
            }
            aquariums[aid].push({ row, col });
          }
        }
      }
      
      // Process each aquarium to map its rows
      for (const id in aquariums) {
        const cells = aquariums[id];
        // Group cells by row
        const rowGroups = {};
        cells.forEach(cell => {
          if (!rowGroups[cell.row]) rowGroups[cell.row] = [];
          rowGroups[cell.row].push(cell);
        });
        aquariums[id] = {
          cells,
          rowGroups,
          rows: Object.keys(rowGroups).map(Number).sort((a, b) => a - b),
        };
      }
    
      // First try constraint propagation
      const initialSolution = solveWithConstraints(puzzle, aquariums);
      if (initialSolution.solved) {
        solution.cells = initialSolution.grid;
        solution.isValid = true;
        return solution;
      }
    
      // If constraints weren't enough, use backtracking search
      const result = backtrackSolve(puzzle, aquariums, initialSolution.grid);
      if (result.solved) {
        solution.cells = result.grid;
        solution.isValid = true;
        return solution;
      }
    
      solution.isValid = false;
      solution.cells = initialSolution.grid; // Return the best attempt we have
      return solution;
    }
    
    function solveWithConstraints(puzzle, aquariums) {
      const grid = Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0));
      let changed = true;
      let iterations = 0;
      const maxIterations = 100;
      
      // Helper functions for constraint checking
      function countRowType(grid, row, type) {
        return grid[row].filter(cell => cell === type).length;
      }
      
      function countColType(grid, col, type) {
        return grid.map(row => row[col]).filter(cell => cell === type).length;
      }
      
      function canFillCell(row, col, type) {
        if (type === 1 && countRowType(grid, row, 1) >= puzzle.waterRow[row]) return false;
        if (type === 1 && countColType(grid, col, 1) >= puzzle.waterCol[col]) return false;
        if (type === 2 && countRowType(grid, row, 2) >= puzzle.oilRow[row]) return false;
        if (type === 2 && countColType(grid, col, 2) >= puzzle.oilCol[col]) return false;
        return true;
      }
    
      // Run constraint propagation loop
      while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        // Apply row and column constraints
        for (let row = 0; row < puzzle.height; row++) {
          const waterNeeded = puzzle.waterRow[row] - countRowType(grid, row, 1);
          const emptyCellsInRow = grid[row].filter(cell => cell === 0).length;
          if (waterNeeded === emptyCellsInRow) {
            for (let col = 0; col < puzzle.width; col++) {
              if (grid[row][col] === 0 && canFillCell(row, col, 1)) {
                grid[row][col] = 1; // Fill with water
                changed = true;
              }
            }
          }
          
          const oilNeeded = puzzle.oilRow[row] - countRowType(grid, row, 2);
          const emptyCellsAfterWater = grid[row].filter(cell => cell === 0).length;
          if (oilNeeded === emptyCellsAfterWater) {
            for (let col = 0; col < puzzle.width; col++) {
              if (grid[row][col] === 0 && canFillCell(row, col, 2)) {
                grid[row][col] = 2; // Fill with oil
                changed = true;
              }
            }
          }
        }
        
        for (let col = 0; col < puzzle.width; col++) {
          const waterNeeded = puzzle.waterCol[col] - countColType(grid, col, 1);
          const emptyCellsInCol = grid.map(row => row[col]).filter(cell => cell === 0).length;
          if (waterNeeded === emptyCellsInCol) {
            for (let row = 0; row < puzzle.height; row++) {
              if (grid[row][col] === 0 && canFillCell(row, col, 1)) {
                grid[row][col] = 1; // Fill with water
                changed = true;
              }
            }
          }
          
          const oilNeeded = puzzle.oilCol[col] - countColType(grid, col, 2);
          const emptyCellsAfterWater = grid.map(row => row[col]).filter(cell => cell === 0).length;
          if (oilNeeded === emptyCellsAfterWater) {
            for (let row = 0; row < puzzle.height; row++) {
              if (grid[row][col] === 0 && canFillCell(row, col, 2)) {
                grid[row][col] = 2; // Fill with oil
                changed = true;
              }
            }
          }
        }
        
        // Apply aquarium level constraints
        for (const id in aquariums) {
          const aquarium = aquariums[id];
          const { cells, rowGroups, rows } = aquarium;
          
          // Check if the aquarium has any water or oil
          let waterFound = false;
          let oilFound = false;
          let waterTopRow = Infinity;
          let oilBottomRow = -1;
          
          for (const cell of cells) {
            if (grid[cell.row][cell.col] === 1) {
              waterFound = true;
              waterTopRow = Math.min(waterTopRow, cell.row);
            } else if (grid[cell.row][cell.col] === 2) {
              oilFound = true;
              oilBottomRow = Math.max(oilBottomRow, cell.row);
            }
          }
          
          // If we found oil but no water, it's invalid - we need to add water below the oil
          if (oilFound && !waterFound) {
            // Find rows below the bottom oil row
            const rowsBelow = rows.filter(r => r > oilBottomRow);
            if (rowsBelow.length > 0) {
              // Try to fill the highest row below oil with water
              const topRowBelow = rowsBelow[0];
              const rowCells = rowGroups[topRowBelow];
              let canFillWithWater = true;
              
              for (const cell of rowCells) {
                if (!canFillCell(cell.row, cell.col, 1)) {
                  canFillWithWater = false;
                  break;
                }
              }
              
              if (canFillWithWater) {
                for (const cell of rowCells) {
                  grid[cell.row][cell.col] = 1;
                  changed = true;
                }
              }
            }
          }
          
          // Apply the level constraint: if a cell has water/oil, all cells in the same row in this aquarium must have the same
          for (const row of rows) {
            const rowCells = rowGroups[row];
            let rowHasWater = false;
            let rowHasOil = false;
            
            for (const cell of rowCells) {
              if (grid[cell.row][cell.col] === 1) rowHasWater = true;
              if (grid[cell.row][cell.col] === 2) rowHasOil = true;
            }
            
            if (rowHasWater && !rowHasOil) {
              for (const cell of rowCells) {
                if (grid[cell.row][cell.col] === 0 && canFillCell(cell.row, cell.col, 1)) {
                  grid[cell.row][cell.col] = 1;
                  changed = true;
                }
              }
            } else if (rowHasOil && !rowHasWater) {
              for (const cell of rowCells) {
                if (grid[cell.row][cell.col] === 0 && canFillCell(cell.row, cell.col, 2)) {
                  grid[cell.row][cell.col] = 2;
                  changed = true;
                }
              }
            }
          }
          
          // Apply the "water must be below oil" constraint
          if (waterFound) {
            // Fill all rows below water top row with water
            for (const row of rows) {
              if (row >= waterTopRow) {
                const rowCells = rowGroups[row];
                for (const cell of rowCells) {
                  if (grid[cell.row][cell.col] === 0 && canFillCell(cell.row, cell.col, 1)) {
                    grid[cell.row][cell.col] = 1;
                    changed = true;
                  }
                }
              }
            }
          }
          
          if (oilFound) {
            // Fill all rows above oil bottom row with oil
            for (const row of rows) {
              if (row <= oilBottomRow && (waterFound ? row < waterTopRow : true)) {
                const rowCells = rowGroups[row];
                for (const cell of rowCells) {
                  if (grid[cell.row][cell.col] === 0 && canFillCell(cell.row, cell.col, 2)) {
                    grid[cell.row][cell.col] = 2;
                    changed = true;
                  }
                }
              }
            }
          }
        }
      }
      
      // Check if puzzle is solved
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
  
    

      function backtrackSolve(puzzle, aquariums, initialGrid) {
        const grid = JSON.parse(JSON.stringify(initialGrid)); // Deep copy
        
        function countRowType(grid, row, type) {
          return grid[row].filter(cell => cell === type).length;
        }
        
        function countColType(grid, col, type) {
          return grid.map(row => row[col]).filter(cell => cell === type).length;
        }
        
        function isValid(grid) {
          // Check row and column constraints
          for (let row = 0; row < puzzle.height; row++) {
            if (countRowType(grid, row, 1) > puzzle.waterRow[row] || 
                countRowType(grid, row, 2) > puzzle.oilRow[row]) {
              return false;
            }
          }
          
          for (let col = 0; col < puzzle.width; col++) {
            if (countColType(grid, col, 1) > puzzle.waterCol[col] || 
                countColType(grid, col, 2) > puzzle.oilCol[col]) {
              return false;
            }
          }
          
          // Check aquarium constraints
          for (const id in aquariums) {
            const { cells, rowGroups, rows } = aquariums[id];
            
            // Check for water level (must be level in each aquarium)
            for (const row of rows) {
              const rowCells = rowGroups[row];
              let hasWater = false;
              let hasOil = false;
              let hasEmpty = false;
              
              for (const cell of rowCells) {
                if (grid[cell.row][cell.col] === 1) hasWater = true;
                else if (grid[cell.row][cell.col] === 2) hasOil = true;
                else hasEmpty = true;
              }
              
              // We can't have both water and oil in the same row
              if (hasWater && hasOil) return false;
              
              // If we have both water and empty, that's invalid - water must be level
              if (hasWater && hasEmpty) return false;
              
              // If we have both oil and empty, that's invalid - oil must be level
              if (hasOil && hasEmpty) return false;
            }
            
            // Check "oil above water" constraint
            let oilRows = [];
            let waterRows = [];
            
            for (const row of rows) {
              const rowCells = rowGroups[row];
              if (rowCells.some(cell => grid[cell.row][cell.col] === 1)) {
                waterRows.push(row);
              }
              if (rowCells.some(cell => grid[cell.row][cell.col] === 2)) {
                oilRows.push(row);
              }
            }
            
            if (oilRows.length > 0 && waterRows.length > 0) {
              const maxOilRow = Math.max(...oilRows);
              const minWaterRow = Math.min(...waterRows);
              
              // Oil must be strictly above water
              if (maxOilRow >= minWaterRow) return false;
            }
            
            // If we have oil, we must have water
            if (oilRows.length > 0 && waterRows.length === 0) return false;
          }
          
          return true;
        }
        
        function isSolution(grid) {
          // Check that all constraints are satisfied exactly
          for (let row = 0; row < puzzle.height; row++) {
            if (countRowType(grid, row, 1) !== puzzle.waterRow[row] || 
                countRowType(grid, row, 2) !== puzzle.oilRow[row]) {
              return false;
            }
          }
          
          for (let col = 0; col < puzzle.width; col++) {
            if (countColType(grid, col, 1) !== puzzle.waterCol[col] || 
                countColType(grid, col, 2) !== puzzle.oilCol[col]) {
              return false;
            }
          }
          
          return isValid(grid);
        }
        
        // Sort aquariums by size (smaller first for efficiency)
        const sortedAquariums = Object.entries(aquariums)
          .map(([id, aquarium]) => ({ id: parseInt(id), ...aquarium }))
          .sort((a, b) => a.cells.length - b.cells.length);
        
        // Define all possible fill patterns for an aquarium
        function generateFillPatterns(aquarium) {
          const { rows, rowGroups } = aquarium;
          const patterns = [];
          
          // We have several possibilities for each aquarium:
          // 1. Empty
          // 2. Only water (from some row to bottom)
          // 3. Oil + water (oil on top, water below)
          
          // Pattern 1: Empty
          patterns.push({ type: 'empty', waterLevel: null, oilLevel: null });
          
          // Pattern 2: Only water from some level
          for (let i = 0; i < rows.length; i++) {
            const waterStartRow = rows[i];
            patterns.push({ 
              type: 'water-only', 
              waterLevel: waterStartRow, 
              oilLevel: null 
            });
          }
          
          // Pattern 3: Oil and water
          for (let i = 0; i < rows.length - 1; i++) {
            for (let j = i + 1; j < rows.length; j++) {
              const oilStartRow = rows[i];
              const waterStartRow = rows[j];
              patterns.push({ 
                type: 'oil-water', 
                oilLevel: oilStartRow,
                waterLevel: waterStartRow 
              });
            }
          }
          
          return patterns;
        }
        
        // Apply a fill pattern to the grid
        function applyPattern(grid, aquarium, pattern) {
          const { cells, rows, rowGroups } = aquarium;
          
          // Reset the aquarium cells
          for (const cell of cells) {
            grid[cell.row][cell.col] = 0;
          }
          
          if (pattern.type === 'empty') {
            // Leave all cells empty
            return;
          } else if (pattern.type === 'water-only') {
            // Fill with water from waterLevel down
            for (const row of rows) {
              if (row >= pattern.waterLevel) {
                const rowCells = rowGroups[row];
                for (const cell of rowCells) {
                  grid[cell.row][cell.col] = 1; // Water
                }
              }
            }
          } else if (pattern.type === 'oil-water') {
            // Fill with oil from oilLevel to just above waterLevel
            for (const row of rows) {
              if (row >= pattern.oilLevel && row < pattern.waterLevel) {
                const rowCells = rowGroups[row];
                for (const cell of rowCells) {
                  grid[cell.row][cell.col] = 2; // Oil
                }
              }
            }
            
            // Fill with water from waterLevel down
            for (const row of rows) {
              if (row >= pattern.waterLevel) {
                const rowCells = rowGroups[row];
                for (const cell of rowCells) {
                  grid[cell.row][cell.col] = 1; // Water
                }
              }
            }
          }
        }
        
        function backtrack(aquariumIndex) {
          // Base case: all aquariums filled
          if (aquariumIndex >= sortedAquariums.length) {
            return isSolution(grid);
          }
          
          const aquarium = sortedAquariums[aquariumIndex];
          const patterns = generateFillPatterns(aquarium);
          
          // Try each pattern
          for (const pattern of patterns) {
            // Make a copy of the current grid state
            const gridBackup = JSON.parse(JSON.stringify(grid));
            
            // Apply the pattern
            applyPattern(grid, aquarium, pattern);
            
            // Check if the grid is still valid
            if (isValid(grid)) {
              // Recursively fill the next aquarium
              if (backtrack(aquariumIndex + 1)) {
                return true;
              }
            }
            
            // Restore the grid
            for (let row = 0; row < puzzle.height; row++) {
              for (let col = 0; col < puzzle.width; col++) {
                grid[row][col] = gridBackup[row][col];
              }
            }
          }
          
          return false;
        }
        
        // Start backtracking from the first aquarium
        const solved = backtrack(0);
        
        return { solved, grid };
      }
  
    function countRowType(grid, row, type) {
      return grid[row].filter(cell => cell === type).length;
    }
  
    function countColType(grid, col, type) {
      return grid.map(row => row[col]).filter(cell => cell === type).length;
    }
  
    function validateSolution(solution, puzzle) {
      const {
        cells,
        width,
        height
      } = solution;
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
        solutionStatus.innerHTML = '<strong>Solution does not satisfy all constraints...</strong>';
        solutionStatus.className = 'error';
      }
    }
  
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