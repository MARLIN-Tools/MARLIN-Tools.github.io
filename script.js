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

  // Preload OR-Tools
  loadORTools().then(() => {
    console.log("OR-Tools ready");
  }).catch(err => {
    console.warn("OR-Tools not available, will use fallback solver:", err);
  });

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

  // Update the solve button click event to wait for OR-Tools
  solvePuzzleButton.addEventListener('click', async function () {
    try {
      currentPuzzle = collectGridData();
      if (validatePuzzleInput(currentPuzzle)) {
        solvePuzzleButton.disabled = true;
        solutionStatus.innerHTML = 'Solving puzzle...';
        solutionStatus.className = '';

        // Try to load OR-Tools first
        try {
          await loadORTools();
        } catch (e) {
          console.warn("Will use fallback solver:", e);
        }

        // Solve the puzzle
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
  const stack = [{ row: startRow, col: startCol }];
  const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
  while (stack.length > 0) {
    const { row, col } = stack.pop();
    if (row < 0 || row >= height || col < 0 || col >= width || visited[row][col] || aquariums[row][col] !== id) {
      continue;
    }
    visited[row][col] = true;
    foundCells++;
    for (const { dr, dc } of directions) {
      stack.push({ row: row + dr, col: col + dc });
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
  // Create the solution object
  const solution = {
    width: puzzle.width,
    height: puzzle.height,
    cells: Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0)),
    isValid: false
  };

  try {
    // Import OR-Tools
    const ortools = window.ortools;
    if (!ortools) {
      throw new Error("OR-Tools library not loaded. Please include the OR-Tools JavaScript library.");
    }

    // Set up the CP-SAT solver
    const cp = ortools.sat;
    const model = new cp.CpModel();

    // Create variables for each cell: 0 = empty, 1 = water, 2 = oil
    const cells = [];
    for (let row = 0; row < puzzle.height; row++) {
      cells[row] = [];
      for (let col = 0; col < puzzle.width; col++) {
        cells[row][col] = model.newIntVar(0, 2, `cell_${row}_${col}`);
      }
    }

    // Organize cells by aquarium ID
    const aquariums = {};
    for (let row = 0; row < puzzle.height; row++) {
      for (let col = 0; col < puzzle.width; col++) {
        const aid = puzzle.aquariums[row][col];
        if (aid) {
          if (!aquariums[aid]) {
            aquariums[aid] = [];
          }
          aquariums[aid].push({ row, col, var: cells[row][col] });
        }
      }
    }

    // Process each aquarium to map its rows
    for (const id in aquariums) {
      const aquariumCells = aquariums[id];
      // Group cells by row
      const rowGroups = {};
      aquariumCells.forEach(cell => {
        if (!rowGroups[cell.row]) rowGroups[cell.row] = [];
        rowGroups[cell.row].push(cell);
      });

      // Get sorted list of rows in this aquarium
      const rows = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);

      // Rule 1: All cells in the same row of an aquarium must have the same value (water level constraint)
      for (const row of rows) {
        const rowCells = rowGroups[row];
        if (rowCells.length > 1) {
          for (let i = 1; i < rowCells.length; i++) {
            model.addEquality(rowCells[0].var, rowCells[i].var);
          }
        }
      }

      // Rule 2: If one row has water, all rows below it must have water
      for (let i = 0; i < rows.length - 1; i++) {
        const upperRowCells = rowGroups[rows[i]];
        const lowerRowCells = rowGroups[rows[i + 1]];

        // If any cell in upper row is water (1), then all cells in lower row must be water (1)
        const upperHasWater = model.newBoolVar(`${id}_row_${rows[i]}_has_water`);
        const upperRowWaterLiterals = upperRowCells.map(cell => model.equality(cell.var, 1));
        model.addBoolOr(upperRowWaterLiterals).onlyEnforceIf(upperHasWater);
        model.addBoolAnd(upperRowWaterLiterals.map(x => x.not())).onlyEnforceIf(upperHasWater.not());

        if (lowerRowCells.length > 0) {
          for (const lowerCell of lowerRowCells) {
            model.addEquality(lowerCell.var, 1).onlyEnforceIf(upperHasWater);
          }
        }
      }

      // Rule 3: Oil must be above water
      // First, create variables tracking if each row has oil or water
      const rowHasOil = {};
      const rowHasWater = {};

      for (const row of rows) {
        rowHasOil[row] = model.newBoolVar(`${id}_row_${row}_has_oil`);
        rowHasWater[row] = model.newBoolVar(`${id}_row_${row}_has_water`);

        const rowCells = rowGroups[row];

        // A row has oil if any cell equals 2
        const oilLiterals = rowCells.map(cell => model.equality(cell.var, 2));
        model.addBoolOr(oilLiterals).onlyEnforceIf(rowHasOil[row]);
        model.addBoolAnd(oilLiterals.map(x => x.not())).onlyEnforceIf(rowHasOil[row].not());

        // A row has water if any cell equals 1
        const waterLiterals = rowCells.map(cell => model.equality(cell.var, 1));
        model.addBoolOr(waterLiterals).onlyEnforceIf(rowHasWater[row]);
        model.addBoolAnd(waterLiterals.map(x => x.not())).onlyEnforceIf(rowHasWater[row].not());

        // A row can't have both oil and water
        model.addBoolOr([rowHasOil[row].not(), rowHasWater[row].not()]);
      }

      // For each pair of rows, enforce that oil can't be below water
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          // If row j has water and row i has oil, this is valid (oil above water)
          // But if row i has water and row j has oil, this is invalid (oil below water)
          model.addBoolOr([
            rowHasWater[rows[i]].not(), // Row i doesn't have water, OR
            rowHasOil[rows[j]].not()    // Row j doesn't have oil
          ]);
        }
      }

      // Rule 4: If aquarium has oil, it must also have water
      const aquariumHasOil = model.newBoolVar(`${id}_has_oil`);
      const oilLiterals = aquariumCells.map(cell => model.equality(cell.var, 2));
      model.addBoolOr(oilLiterals).onlyEnforceIf(aquariumHasOil);
      model.addBoolAnd(oilLiterals.map(x => x.not())).onlyEnforceIf(aquariumHasOil.not());

      const aquariumHasWater = model.newBoolVar(`${id}_has_water`);
      const waterLiterals = aquariumCells.map(cell => model.equality(cell.var, 1));
      model.addBoolOr(waterLiterals).onlyEnforceIf(aquariumHasWater);
      model.addBoolAnd(waterLiterals.map(x => x.not())).onlyEnforceIf(aquariumHasWater.not());

      // If there's oil, there must be water
      model.addImplication(aquariumHasOil, aquariumHasWater);
    }

    // Row and column constraints for water and oil counts
    for (let row = 0; row < puzzle.height; row++) {
      // Count water cells in this row
      const waterLiterals = [];
      for (let col = 0; col < puzzle.width; col++) {
        waterLiterals.push(model.equality(cells[row][col], 1));
      }
      model.addExactlyOne(waterLiterals.slice(0, puzzle.waterRow[row]));

      // Count oil cells in this row
      const oilLiterals = [];
      for (let col = 0; col < puzzle.width; col++) {
        oilLiterals.push(model.equality(cells[row][col], 2));
      }
      model.addExactlyOne(oilLiterals.slice(0, puzzle.oilRow[row]));
    }

    for (let col = 0; col < puzzle.width; col++) {
      // Count water cells in this column
      const waterLiterals = [];
      for (let row = 0; row < puzzle.height; row++) {
        waterLiterals.push(model.equality(cells[row][col], 1));
      }
      model.addExactlyOne(waterLiterals.slice(0, puzzle.waterCol[col]));

      // Count oil cells in this column
      const oilLiterals = [];
      for (let row = 0; row < puzzle.height; row++) {
        oilLiterals.push(model.equality(cells[row][col], 2));
      }
      model.addExactlyOne(oilLiterals.slice(0, puzzle.oilCol[col]));
    }

    // Solve the model
    const solver = new cp.CpSolver();
    const status = solver.solve(model);

    if (status === cp.OPTIMAL || status === cp.FEASIBLE) {
      // Extract the solution
      for (let row = 0; row < puzzle.height; row++) {
        for (let col = 0; col < puzzle.width; col++) {
          solution.cells[row][col] = solver.value(cells[row][col]);
        }
      }
      solution.isValid = true;
    } else {
      console.error("No solution found with status:", status);
      solution.isValid = false;
    }
  } catch (error) {
    console.error("Error in OR-Tools solver:", error);
    // Fall back to the original solver if OR-Tools fails
    return fallbackSolver(puzzle);
  }

  return solution;
}

// Fallback solver in case OR-Tools is not available or fails
// This is kept as a minimal stub – you can replace it with a proper backup solver if desired.
function fallbackSolver(puzzle) {
  const solution = {
    width: puzzle.width,
    height: puzzle.height,
    cells: Array(puzzle.height).fill().map(() => Array(puzzle.width).fill(0)),
    isValid: false
  };
  return solution;
}

// Helper function to ensure OR-Tools is loaded
function loadORTools() {
  return new Promise((resolve, reject) => {
    // Check if OR-Tools is already loaded
    if (window.ortools) {
      resolve();
      return;
    }

    // Load OR-Tools from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/js-or-tools@1.0.0/dist/js-or-tools.js';
    script.onload = () => {
      // Initialize OR-Tools
      window.ortools.sat.init().then(() => {
        console.log("OR-Tools initialized successfully");
        resolve();
      }).catch(err => {
        console.error("Failed to initialize OR-Tools:", err);
        reject(err);
      });
    };
    script.onerror = () => {
      console.error("Failed to load OR-Tools library");
      reject(new Error("Failed to load OR-Tools library"));
    };
    document.head.appendChild(script);
  });
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
    solutionStatus.innerHTML = '<strong>Solution does not satisfy the constraints. :( </strong>';
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