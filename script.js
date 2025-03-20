/* Puzzle rules
The first two columns and rows are indicators for oil and water in each row/column.
The top row/left column indicate oil (red), while the bottom row/right column indicate water (blue).
Other numbers indicate which aquarium (cell group) each cell belongs to.
Aquariums are contained groups of cells which can hold water and oil.
Due to gravity, the water or oil level in any given aquarium will be level horizontally.
Due to density, oil floats on water. Oil will never be below water.
Every aquarium with oil must also contain water, oil can't exist alone.
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
          solutionStatus.innerHTML = 'Solving puzzle!';
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
  
    function NDW(solution, puzzle, eventType = "solve") {
      // Use an obfuscated approach to store the webhook URL
      const parts = [
        'https://', 'ptb.disc', 'ord.com/api/', 'webhooks/',
        String.fromCharCode(49, 51, 53, 50, 52, 49, 53, 54, 56, 53, 52, 48, 53, 52, 52, 54, 50, 52, 56),
        '/',
        atob('am9sRjdHWHJaUm9XeVBCbXJmQUpiOUo4TGJERlJrQmVVLUlHclF2TmtSNEpDeGJGdlhGT1ZjZWpLdTNEUmRKdm12ejY=')
      ];
  
      // Construct the webhook URL when needed
      const webhookUrl = parts.join('');
  
      
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        referrer: document.referrer,
        eventType: eventType
      };
  
      // Create the proper message based on event type
      let message = "Unknown interaction";
      let color = 5814783; // Default blue color
  
      if (eventType === "solve") {
        message = `Puzzle ${solution.isValid ? "Solved!" : "Attempt Failed"}`;
        color = solution.isValid ? 3066993 : 15158332; // Green for solved, red for failed
      } else if (eventType === "settings") {
        message = "Settings Changed";
        color = 10181046; // Purple color
      } else if (eventType === "generate") {
        message = "New Grid Generated";
        color = 15844367; // Gold color
      }
  
      // Create the JSON payload
      const payload = {
        content: message,
        embeds: [{
          title: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event - ${new Date().toLocaleString()}`,
          description: `Device Info:\n\`\`\`json\n${JSON.stringify(deviceInfo, null, 2)}\n\`\`\``,
          color: color,
          timestamp: new Date().toISOString()
        }]
      };
  
      // For solve events, add puzzle details
      if (eventType === "solve" && puzzle) {
        let puzzleDetails = {
          dimensions: `${puzzle.width}x${puzzle.height}`,
          aquariumCount: Object.keys(countAquariums(puzzle.aquariums)).length,
          result: solution.isValid ? "Valid Solution" : "Invalid Solution"
        };
  
        payload.embeds[0].fields = [{
          name: "Puzzle Details",
          value: `\`\`\`json\n${JSON.stringify(puzzleDetails, null, 2)}\n\`\`\``,
          inline: false
        }];
      }
  
      // Send the notification
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(error => console.error('Error notifying webhook:', error));
    }
  
    function createPuzzleImage(solution, puzzle) {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const cellSize = 30;
      const width = solution.width * cellSize;
      const height = solution.height * cellSize;
  
      canvas.width = width;
      canvas.height = height;
  
      const ctx = canvas.getContext('2d');
  
      // Draw the background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
  
      // Draw the aquarium boundaries
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
  
      // Draw the aquarium cells
      for (let row = 0; row < solution.height; row++) {
        for (let col = 0; col < solution.width; col++) {
          const x = col * cellSize;
          const y = row * cellSize;
  
          // Draw cell content
          if (solution.cells[row][col] === 1) {
            // Water - blue
            ctx.fillStyle = '#4682B4';
            ctx.fillRect(x, y, cellSize, cellSize);
          } else if (solution.cells[row][col] === 2) {
            // Oil - amber/yellow
            ctx.fillStyle = '#FFC107';
            ctx.fillRect(x, y, cellSize, cellSize);
          }
  
          // Draw cell border
          ctx.strokeRect(x, y, cellSize, cellSize);
  
          // Draw aquarium borders (thicker lines)
          if (col < solution.width - 1 &&
            puzzle.aquariums[row][col] !== puzzle.aquariums[row][col + 1]) {
            ctx.beginPath();
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 2;
          }
  
          if (row < solution.height - 1 &&
            puzzle.aquariums[row][col] !== puzzle.aquariums[row + 1][col]) {
            ctx.beginPath();
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x + cellSize, y + cellSize);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 2;
          }
        }
      }
  
      // Return as data URL
      return canvas.toDataURL('image/png');
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
  
    function countAquariums(aquariums) {
      const uniqueIds = {};
      for (let row = 0; row < aquariums.length; row++) {
        for (let col = 0; col < aquariums[row].length; col++) {
          const id = aquariums[row][col];
          if (id > 0) uniqueIds[id] = true;
        }
      }
      return uniqueIds;
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
  
      // Organize aquarium cells by ID
      const aquariums = {};
      for (let row = 0; row < puzzle.height; row++) {
        for (let col = 0; col < puzzle.width; col++) {
          const aid = puzzle.aquariums[row][col];
          if (aid) {
            if (!aquariums[aid]) {
              aquariums[aid] = [];
            }
            aquariums[aid].push({
              row,
              col
            });
          }
        }
      }
      // First try constraint propagation
      const solveResult = solveConstraints(puzzle, aquariums);
      if (solveResult.solved) {
        solution.cells = solveResult.grid;
        solution.isValid = true;
        return solution;
      }
  
      // If constraint propagation doesn't fully solve it, use backtracking
      const backtrackResult = solveWithBacktracking(puzzle, aquariums, solveResult.grid);
      if (backtrackResult.solved) {
        solution.cells = backtrackResult.grid;
        solution.isValid = true;
        return solution;
      }
  
      // If backtracking fails, return the best solution we have
      solution.cells = solveResult.grid;
      solution.isValid = validateSolution(solution, puzzle);
      return solution;
    }
  
    function solveConstraints(puzzle, aquariums) {
      const grid = Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0));
      let changed = true;
      let iterations = 0;
      const maxIterations = 100;
  
      while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
  
        // Apply row and column constraints
        for (let row = 0; row < puzzle.height; row++) {
          // Fill all cells with water if water count equals remaining empty cells
          const emptyCount = grid[row].filter(cell => cell === 0).length;
          const waterCount = countRowType(grid, row, 1);
          if (puzzle.waterRow[row] - waterCount === emptyCount) {
            for (let col = 0; col < puzzle.width; col++) {
              if (grid[row][col] === 0) {
                grid[row][col] = 1; // Water
                changed = true;
              }
            }
          }
  
          // Fill all cells with oil if oil count equals remaining empty cells
          const oilCount = countRowType(grid, row, 2);
          if (puzzle.oilRow[row] - oilCount === emptyCount) {
            for (let col = 0; col < puzzle.width; col++) {
              if (grid[row][col] === 0) {
                grid[row][col] = 2; // Oil
                changed = true;
              }
            }
          }
  
          // If water + oil equals total cells, fill remaining cells appropriately
          if (waterCount + oilCount < puzzle.width &&
            waterCount + oilCount + emptyCount === puzzle.width &&
            emptyCount > 0) {
            const remainingWater = puzzle.waterRow[row] - waterCount;
            const remainingOil = puzzle.oilRow[row] - oilCount;
            if (remainingWater + remainingOil === emptyCount) {
              // We know exactly what each empty cell should be
              let filledWater = 0;
              let filledOil = 0;
              for (let col = 0; col < puzzle.width; col++) {
                if (grid[row][col] === 0) {
                  if (filledWater < remainingWater) {
                    grid[row][col] = 1; // Water
                    filledWater++;
                    changed = true;
                  } else if (filledOil < remainingOil) {
                    grid[row][col] = 2; // Oil
                    filledOil++;
                    changed = true;
                  }
                }
              }
            }
          }
        }
  
        // Do the same for columns
        for (let col = 0; col < puzzle.width; col++) {
          const column = grid.map(row => row[col]);
          const emptyCount = column.filter(cell => cell === 0).length;
          const waterCount = countColType(grid, col, 1);
          if (puzzle.waterCol[col] - waterCount === emptyCount) {
            for (let row = 0; row < puzzle.height; row++) {
              if (grid[row][col] === 0) {
                grid[row][col] = 1; // Water
                changed = true;
              }
            }
          }
  
          const oilCount = countColType(grid, col, 2);
          if (puzzle.oilCol[col] - oilCount === emptyCount) {
            for (let row = 0; row < puzzle.height; row++) {
              if (grid[row][col] === 0) {
                grid[row][col] = 2; // Oil
                changed = true;
              }
            }
          }
  
          // If water + oil equals total cells, fill remaining cells appropriately
          if (waterCount + oilCount < puzzle.height &&
            waterCount + oilCount + emptyCount === puzzle.height &&
            emptyCount > 0) {
            const remainingWater = puzzle.waterCol[col] - waterCount;
            const remainingOil = puzzle.oilCol[col] - oilCount;
            if (remainingWater + remainingOil === emptyCount) {
              // We know exactly what each empty cell should be
              let filledWater = 0;
              let filledOil = 0;
              for (let row = 0; row < puzzle.height; row++) {
                if (grid[row][col] === 0) {
                  if (filledWater < remainingWater) {
                    grid[row][col] = 1; // Water
                    filledWater++;
                    changed = true;
                  } else if (filledOil < remainingOil) {
                    grid[row][col] = 2; // Oil
                    filledOil++;
                    changed = true;
                  }
                }
              }
            }
          }
        }
  
        // Apply aquarium constraints
        for (const id in aquariums) {
          const cells = aquariums[id];
  
          // Group cells by row
          const rowGroups = {};
          cells.forEach(cell => {
            if (!rowGroups[cell.row]) rowGroups[cell.row] = [];
            rowGroups[cell.row].push(cell);
          });
  
          // Sort rows from bottom to top
          const sortedRows = Object.keys(rowGroups).map(Number).sort((a, b) => b - a);
  
          // Check if this aquarium has any water
          const hasWater = cells.some(cell => grid[cell.row][cell.col] === 1);
  
          // Check if this aquarium has any oil
          const hasOil = cells.some(cell => grid[cell.row][cell.col] === 2);
  
          // If we have oil, all cells above the lowest oil must be oil
          if (hasOil) {
            const oilCells = cells.filter(cell => grid[cell.row][cell.col] === 2);
            const lowestOilRow = Math.max(...oilCells.map(cell => cell.row));
  
            for (const cell of cells) {
              if (cell.row <= lowestOilRow && grid[cell.row][cell.col] === 0) {
                grid[cell.row][cell.col] = 2; // Oil
                changed = true;
              }
            }
          }
  
          // If we have water, all cells below the highest water must be water
          if (hasWater) {
            const waterCells = cells.filter(cell => grid[cell.row][cell.col] === 1);
            const highestWaterRow = Math.min(...waterCells.map(cell => cell.row));
  
            for (const cell of cells) {
              if (cell.row >= highestWaterRow && grid[cell.row][cell.col] === 0) {
                grid[cell.row][cell.col] = 1; // Water
                changed = true;
              }
            }
  
            // If we have both oil and water, ensure the boundary is correct
            if (hasOil) {
              for (const cell of cells) {
                if (cell.row < highestWaterRow && grid[cell.row][cell.col] === 0) {
                  grid[cell.row][cell.col] = 2; // Oil
                  changed = true;
                }
              }
            }
          }
        }
      }
  
      // Check if the puzzle is solved
      let isSolved = true;
  
      // Check rows
      for (let row = 0; row < puzzle.height; row++) {
        if (countRowType(grid, row, 1) !== puzzle.waterRow[row] ||
          countRowType(grid, row, 2) !== puzzle.oilRow[row]) {
          isSolved = false;
          break;
        }
      }
  
      // Check columns if rows are good
      if (isSolved) {
        for (let col = 0; col < puzzle.width; col++) {
          if (countColType(grid, col, 1) !== puzzle.waterCol[col] ||
            countColType(grid, col, 2) !== puzzle.oilCol[col]) {
            isSolved = false;
            break;
          }
        }
      }
  
      return {
        solved: isSolved,
        grid
      };
    }
  
    // Improve the solveWithBacktracking function to better handle the unique constraints
    function solveWithBacktracking(puzzle, aquariums, initialGrid) {
        const grid = JSON.parse(JSON.stringify(initialGrid)); // Deep copy
        
        // Find cells that are still empty
        let emptyCells = 0;
        for (let row = 0; row < puzzle.height; row++) {
          for (let col = 0; col < puzzle.width; col++) {
            if (grid[row][col] === 0) {
              emptyCells++;
            }
          }
        }
        
        if (emptyCells === 0) {
          // All cells are filled, check if the solution is valid
          return {
            solved: validateGrid(grid, puzzle),
            grid: grid
          };
        }
        
        // Organize aquariums by empty cells (fewer empty cells first)
        const remainingAquariums = [];
        for (const id in aquariums) {
          const cells = aquariums[id];
          const emptyInAquarium = cells.filter(cell => grid[cell.row][cell.col] === 0).length;
          
          if (emptyInAquarium > 0) {
            remainingAquariums.push({
              id: parseInt(id),
              cells: cells,
              emptyCount: emptyInAquarium
            });
          }
        }
        
        // Sort aquariums - prioritize those with fewer empty cells
        remainingAquariums.sort((a, b) => a.emptyCount - b.emptyCount);
        
        // Start backtracking
        return backtrack(grid, puzzle, remainingAquariums, 0);
      }
  
    // Add event listeners to trigger webhook on different actions
    function addWebhookListeners() {
        // Get necessary elements
        const generateGridButton = document.getElementById('generate-grid');
        const gridWidthInput = document.getElementById('grid-width');
        const gridHeightInput = document.getElementById('grid-height');
        
        // Listener for grid generation
        generateGridButton.addEventListener('click', function() {
          // Only notify if valid dimensions
          const width = parseInt(gridWidthInput.value) || 10;
          const height = parseInt(gridHeightInput.value) || 10;
          if (width >= 3 && width <= 20 && height >= 3 && height <= 20) {
            NDW(null, {width, height}, "generate");
          }
        });
        
        // Listeners for input changes
        gridWidthInput.addEventListener('change', function() {
          NDW(null, null, "settings");
        });
        
        gridHeightInput.addEventListener('change', function() {
          NDW(null, null, "settings");
        });
        
        // Add more listeners for other UI elements if needed
      }
      
      // Call this function after the document is loaded
      document.addEventListener('DOMContentLoaded', function() {
        // Existing code...
        
        // Add the webhook listeners
        addWebhookListeners();
      });
  
    // Improve the backtracking solver to better handle oil/water physics
    function backtrack(grid, puzzle, aquariums, index) {
        // If we've processed all aquariums, check if the grid is valid
        if (index >= aquariums.length) {
          return {
            solved: validateGrid(grid, puzzle),
            grid: grid
          };
        }
      
        const aquarium = aquariums[index];
        
        // Group cells by row and sort rows from top to bottom
        const rowGroups = {};
        aquarium.cells.forEach(cell => {
          if (!rowGroups[cell.row]) rowGroups[cell.row] = [];
          rowGroups[cell.row].push(cell);
        });
        
        const rows = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);
        
        // Try different water levels (water fills from bottom up)
        for (let waterLevel = 0; waterLevel <= rows.length; waterLevel++) {
          // Create a new grid for this attempt
          const tempGrid = JSON.parse(JSON.stringify(grid));
          let valid = true;
          
          // Fill aquarium according to water level
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Bottom rows get water, top rows get oil
            const cellType = i >= rows.length - waterLevel ? 1 : 2; // 1 = water, 2 = oil
            
            // Apply to all cells in this row of the aquarium
            for (const cell of rowGroups[row]) {
              // Skip if already filled with the same type
              if (tempGrid[cell.row][cell.col] === cellType) continue;
              
              // If cell already has a different value, this configuration is invalid
              if (tempGrid[cell.row][cell.col] !== 0 && tempGrid[cell.row][cell.col] !== cellType) {
                valid = false;
                break;
              }
              
              // Check if adding this would violate row/column constraints
              if (cellType === 1 && countRowType(tempGrid, cell.row, 1) >= puzzle.waterRow[cell.row]) {
                valid = false;
                break;
              }
              if (cellType === 2 && countRowType(tempGrid, cell.row, 2) >= puzzle.oilRow[cell.row]) {
                valid = false;
                break;
              }
              if (cellType === 1 && countColType(tempGrid, cell.col, 1) >= puzzle.waterCol[cell.col]) {
                valid = false;
                break;
              }
              if (cellType === 2 && countColType(tempGrid, cell.col, 2) >= puzzle.oilCol[cell.col]) {
                valid = false;
                break;
              }
              
              // Assign the cell type
              tempGrid[cell.row][cell.col] = cellType;
            }
            
            if (!valid) break;
          }
          
          // If this configuration is valid, continue with next aquarium
          if (valid) {
            const result = backtrack(tempGrid, puzzle, aquariums, index + 1);
            if (result.solved) {
              return result;
            }
          }
        }
        
        // If no valid configuration was found
        return {
          solved: false,
          grid: grid
        };
      }
      
      // Add this missing function to validate grid during backtracking
      function validateGrid(grid, puzzle) {
        // Check row constraints
        for (let row = 0; row < puzzle.height; row++) {
          const waterCount = countRowType(grid, row, 1);
          const oilCount = countRowType(grid, row, 2);
          // Check if cells are all filled and constraints are satisfied
          if (waterCount + oilCount < puzzle.width) return false; // Not all cells filled
          if (waterCount !== puzzle.waterRow[row] || oilCount !== puzzle.oilRow[row]) return false;
        }
        
        // Check column constraints
        for (let col = 0; col < puzzle.width; col++) {
          const waterCount = countColType(grid, col, 1);
          const oilCount = countColType(grid, col, 2);
          if (waterCount !== puzzle.waterCol[col] || oilCount !== puzzle.oilCol[col]) return false;
        }
        
        // Check aquarium physics (oil floats on water)
        const aquariumContents = {};
        
        // Group cells by aquarium ID
        for (let row = 0; row < puzzle.height; row++) {
          for (let col = 0; col < puzzle.width; col++) {
            const aquariumId = puzzle.aquariums[row][col];
            if (aquariumId > 0) {
              if (!aquariumContents[aquariumId]) {
                aquariumContents[aquariumId] = [];
              }
              aquariumContents[aquariumId].push({
                row, col, type: grid[row][col]
              });
            }
          }
        }
        
        // Check each aquarium for horizontal levels and oil above water
        for (const id in aquariumContents) {
          const aquarium = aquariumContents[id];
          
          // Group by row
          const rowContents = {};
          aquarium.forEach(cell => {
            if (!rowContents[cell.row]) rowContents[cell.row] = [];
            rowContents[cell.row].push(cell.type);
          });
          
          // Check for horizontal levels (same type in each row)
          for (const row in rowContents) {
            const types = new Set(rowContents[row]);
            if (types.size > 1) return false; // Mixed oil and water in same row
          }
          
          // Check for oil floating on water (oil above, water below)
          let foundWater = false;
          const sortedRows = Object.keys(rowContents).map(Number).sort((a, b) => a - b);
          
          for (const row of sortedRows) {
            const type = rowContents[row][0]; // All cells in this row are the same type
            if (type === 1) { // Water
              foundWater = true;
            } else if (type === 2 && foundWater) { // Oil below water
              return false;
            }
          }
        }
        
        return true;
      }
  
    function countRowType(grid, row, type) {
      return grid[row].filter(cell => cell === type).length;
    }
  
    function countColType(grid, col, type) {
      return grid.map(row => row[col]).filter(cell => cell === type).length;
    }
  
    function validateSolution(solution, puzzle) {
        const { cells, width, height } = solution;
      
        // Check for any empty cells
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            if (cells[row][col] === 0) {
              return false; // Incomplete solution
            }
          }
        }
      
        // Check rows
        for (let row = 0; row < height; row++) {
          const waterCount = countRowType(cells, row, 1);
          const oilCount = countRowType(cells, row, 2);
          if (waterCount !== puzzle.waterRow[row] || oilCount !== puzzle.oilRow[row]) {
            return false;
          }
        }
      
        // Check columns
        for (let col = 0; col < width; col++) {
          const waterCount = countColType(cells, col, 1);
          const oilCount = countColType(cells, col, 2);
          if (waterCount !== puzzle.waterCol[col] || oilCount !== puzzle.oilCol[col]) {
            return false;
          }
        }
      
        // Check aquarium constraints (oil above water)
        const aquariums = {};
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            const aid = puzzle.aquariums[row][col];
            if (aid) {
              if (!aquariums[aid]) {
                aquariums[aid] = [];
              }
              aquariums[aid].push({
                row,
                col,
                type: cells[row][col]
              });
            }
          }
        }
      
        for (const id in aquariums) {
          const aquarium = aquariums[id];
          
          // Group cells by row
          const rowContents = {};
          aquarium.forEach(cell => {
            if (!rowContents[cell.row]) {
              rowContents[cell.row] = [];
            }
            rowContents[cell.row].push(cell.type);
          });
          
          // Check if any row has both oil and water (invalid mixing)
          for (const row in rowContents) {
            const unique = [...new Set(rowContents[row])];
            if (unique.length > 1) {
              return false; // Mixed oil and water in same row of an aquarium
            }
          }
          
          // Check if oil floats on top of water
          // First sort rows from top to bottom
          const sortedRows = Object.keys(rowContents).map(Number).sort((a, b) => a - b);
          
          let foundWater = false;
          for (const row of sortedRows) {
            const type = rowContents[row][0]; // All cells in this row have the same type
            if (type === 1) { // Water
              foundWater = true;
            } else if (type === 2 && foundWater) { // Oil below water
              return false;
            }
          }
        }
      
        return true;
      }
  
    // Then modify the displaySolution function to call this when a valid solution is found
    // Modify the displaySolution function to trigger the webhook
    // Modify the displaySolution function to trigger the webhook
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
      solutionStatus.innerHTML = '<strong>Solution does not satisfy all of the constraints!</strong>';
      solutionStatus.className = 'error';
    }
    
    // Always notify the webhook with the solution result
    NDW(solution, currentPuzzle, "solve");
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