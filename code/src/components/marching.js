// marching.js
// implements the marching cubes algorithm

import {VecMath} from "./VecMath.js";
export {generateMesh, generateMeshVTK};

// vertex and edge convention used:
//                 7-------6          x---6---x
//                /|      /|     11  7|      5|  10
// z(k)          4-+-----5 |        x-+-4---x |
// ^ y(j)        | 3-----+-2        | x---2-+-x 
// |/            |/      |/      8  |3      |1   9
// o-->x(i)      0-------1          x---0---x

// coordinates of vertexes in relation to 0
const vertCoordTable = [
    [0, 0, 0], // 0
    [1, 0, 0], // 1
    [1, 1, 0], // 2
    [0, 1, 0], // 3
    [0, 0, 1], // 4
    [1, 0, 1], // 5
    [1, 1, 1], // 6
    [0, 1, 1], // 7
]

// table of active edges for a specific vertex code
// in order
const edgeTable = [
    [],
    [0,3,8],
    [0,1,9],
    [1,3,8,9],
    [1,2,10],
    [0,1,2,3,8,10],
    [0,2,9,10],
    [2,3,8,9,10],
    [2,3,11],
    [0,2,8,11],
    [0,1,2,3,9,11],
    [1,2,8,9,11],
    [1,3,10,11],
    [0,1,8,10,11],
    [0,3,9,10,11],
    [8,9,10,11],
    [4,7,8],
    [0,3,4,7],
    [0,1,4,7,8,9],
    [1,3,4,7,9],
    [1,2,4,7,8,10],
    [0,1,2,3,4,7,10],
    [0,2,4,7,8,9,10],
    [2,3,4,7,9,10],
    [2,3,4,7,8,11],
    [0,2,4,7,11],
    [0,1,2,3,4,7,8,9,11],
    [1,2,4,7,9,11],
    [1,3,4,7,8,10,11],
    [0,1,4,7,10,11],
    [0,3,4,7,8,9,10,11],
    [4,7,9,10,11],
    [4,5,9],
    [0,3,4,5,8,9],
    [0,1,4,5],
    [1,3,4,5,8],
    [1,2,4,5,9,10],
    [0,1,2,3,4,5,8,9,10],
    [0,2,4,5,10],
    [2,3,4,5,8,10],
    [2,3,4,5,9,11],
    [0,2,4,5,8,9,11],
    [0,1,2,3,4,5,11],
    [1,2,4,5,8,11],
    [1,3,4,5,9,10,11],
    [0,1,4,5,8,9,10,11],
    [0,3,4,5,10,11],
    [4,5,8,10,11],
    [5,7,8,9],
    [0,3,5,7,9],
    [0,1,5,7,8],
    [1,3,5,7],
    [1,2,5,7,8,9,10],
    [0,1,2,3,5,7,9,10],
    [0,2,5,7,8,10],
    [2,3,5,7,10],
    [2,3,5,7,8,9,11],
    [0,2,5,7,9,11],
    [0,1,2,3,5,7,8,11],
    [1,2,5,7,11],
    [1,3,5,7,8,9,10,11],
    [0,1,5,7,9,10,11],
    [0,3,5,7,8,10,11],
    [5,7,10,11],
    [5,6,10],
    [0,3,5,6,8,10],
    [0,1,5,6,9,10],
    [1,3,5,6,8,9,10],
    [1,2,5,6],
    [0,1,2,3,5,6,8],
    [0,2,5,6,9],
    [2,3,5,6,8,9],
    [2,3,5,6,10,11],
    [0,2,5,6,8,10,11],
    [0,1,2,3,5,6,9,10,11],
    [1,2,5,6,8,9,10,11],
    [1,3,5,6,11],
    [0,1,5,6,8,11],
    [0,3,5,6,9,11],
    [5,6,8,9,11],
    [4,5,6,7,8,10],
    [0,3,4,5,6,7,10],
    [0,1,4,5,6,7,8,9,10],
    [1,3,4,5,6,7,9,10],
    [1,2,4,5,6,7,8],
    [0,1,2,3,4,5,6,7],
    [0,2,4,5,6,7,8,9],
    [2,3,4,5,6,7,9],
    [2,3,4,5,6,7,8,10,11],
    [0,2,4,5,6,7,10,11],
    [0,1,2,3,4,5,6,7,8,9,10,11],
    [1,2,4,5,6,7,9,10,11],
    [1,3,4,5,6,7,8,11],
    [0,1,4,5,6,7,11],
    [0,3,4,5,6,7,8,9,11],
    [4,5,6,7,9,11],
    [4,6,9,10],
    [0,3,4,6,8,9,10],
    [0,1,4,6,10],
    [1,3,4,6,8,10],
    [1,2,4,6,9],
    [0,1,2,3,4,6,8,9],
    [0,2,4,6],
    [2,3,4,6,8],
    [2,3,4,6,9,10,11],
    [0,2,4,6,8,9,10,11],
    [0,1,2,3,4,6,10,11],
    [1,2,4,6,8,10,11],
    [1,3,4,6,9,11],
    [0,1,4,6,8,9,11],
    [0,3,4,6,11],
    [4,6,8,11],
    [6,7,8,9,10],
    [0,3,6,7,9,10],
    [0,1,6,7,8,10],
    [1,3,6,7,10],
    [1,2,6,7,8,9],
    [0,1,2,3,6,7,9],
    [0,2,6,7,8],
    [2,3,6,7],
    [2,3,6,7,8,9,10,11],
    [0,2,6,7,9,10,11],
    [0,1,2,3,6,7,8,10,11],
    [1,2,6,7,10,11],
    [1,3,6,7,8,9,11],
    [0,1,6,7,9,11],
    [0,3,6,7,8,11],
    [6,7,11],
    [6,7,11],
    [0,3,6,7,8,11],
    [0,1,6,7,9,11],
    [1,3,6,7,8,9,11],
    [1,2,6,7,10,11],
    [0,1,2,3,6,7,8,10,11],
    [0,2,6,7,9,10,11],
    [2,3,6,7,8,9,10,11],
    [2,3,6,7],
    [0,2,6,7,8],
    [0,1,2,3,6,7,9],
    [1,2,6,7,8,9],
    [1,3,6,7,10],
    [0,1,6,7,8,10],
    [0,3,6,7,9,10],
    [6,7,8,9,10],
    [4,6,8,11],
    [0,3,4,6,11],
    [0,1,4,6,8,9,11],
    [1,3,4,6,9,11],
    [1,2,4,6,8,10,11],
    [0,1,2,3,4,6,10,11],
    [0,2,4,6,8,9,10,11],
    [2,3,4,6,9,10,11],
    [2,3,4,6,8],
    [0,2,4,6],
    [0,1,2,3,4,6,8,9],
    [1,2,4,6,9],
    [1,3,4,6,8,10],
    [0,1,4,6,10],
    [0,3,4,6,8,9,10],
    [4,6,9,10],
    [4,5,6,7,9,11],
    [0,3,4,5,6,7,8,9,11],
    [0,1,4,5,6,7,11],
    [1,3,4,5,6,7,8,11],
    [1,2,4,5,6,7,9,10,11],
    [0,1,2,3,4,5,6,7,8,9,10,11],
    [0,2,4,5,6,7,10,11],
    [2,3,4,5,6,7,8,10,11],
    [2,3,4,5,6,7,9],
    [0,2,4,5,6,7,8,9],
    [0,1,2,3,4,5,6,7],
    [1,2,4,5,6,7,8],
    [1,3,4,5,6,7,9,10],
    [0,1,4,5,6,7,8,9,10],
    [0,3,4,5,6,7,10],
    [4,5,6,7,8,10],
    [5,6,8,9,11],
    [0,3,5,6,9,11],
    [0,1,5,6,8,11],
    [1,3,5,6,11],
    [1,2,5,6,8,9,10,11],
    [0,1,2,3,5,6,9,10,11],
    [0,2,5,6,8,10,11],
    [2,3,5,6,10,11],
    [2,3,5,6,8,9],
    [0,2,5,6,9],
    [0,1,2,3,5,6,8],
    [1,2,5,6],
    [1,3,5,6,8,9,10],
    [0,1,5,6,9,10],
    [0,3,5,6,8,10],
    [5,6,10],
    [5,7,10,11],
    [0,3,5,7,8,10,11],
    [0,1,5,7,9,10,11],
    [1,3,5,7,8,9,10,11],
    [1,2,5,7,11],
    [0,1,2,3,5,7,8,11],
    [0,2,5,7,9,11],
    [2,3,5,7,8,9,11],
    [2,3,5,7,10],
    [0,2,5,7,8,10],
    [0,1,2,3,5,7,9,10],
    [1,2,5,7,8,9,10],
    [1,3,5,7],
    [0,1,5,7,8],
    [0,3,5,7,9],
    [5,7,8,9],
    [4,5,8,10,11],
    [0,3,4,5,10,11],
    [0,1,4,5,8,9,10,11],
    [1,3,4,5,9,10,11],
    [1,2,4,5,8,11],
    [0,1,2,3,4,5,11],
    [0,2,4,5,8,9,11],
    [2,3,4,5,9,11],
    [2,3,4,5,8,10],
    [0,2,4,5,10],
    [0,1,2,3,4,5,8,9,10],
    [1,2,4,5,9,10],
    [1,3,4,5,8],
    [0,1,4,5],
    [0,3,4,5,8,9],
    [4,5,9],
    [4,7,9,10,11],
    [0,3,4,7,8,9,10,11],
    [0,1,4,7,10,11],
    [1,3,4,7,8,10,11],
    [1,2,4,7,9,11],
    [0,1,2,3,4,7,8,9,11],
    [0,2,4,7,11],
    [2,3,4,7,8,11],
    [2,3,4,7,9,10],
    [0,2,4,7,8,9,10],
    [0,1,2,3,4,7,10],
    [1,2,4,7,8,10],
    [1,3,4,7,9],
    [0,1,4,7,8,9],
    [0,3,4,7],
    [4,7,8],
    [8,9,10,11],
    [0,3,9,10,11],
    [0,1,8,10,11],
    [1,3,10,11],
    [1,2,8,9,11],
    [0,1,2,3,9,11],
    [0,2,8,11],
    [2,3,11],
    [2,3,8,9,10],
    [0,2,9,10],
    [0,1,2,3,8,10],
    [1,2,10],
    [1,3,8,9],
    [0,1,9],
    [0,3,8],
    []
] 

// converts from an edge number to the numbers of the vertices it connects
const edgeToVertsTable = [
    [0, 1], // 0
    [1, 2], // 1
    [2, 3], // 2
    [0, 3], // 3
    [4, 5], // 4
    [5, 6], // 5
    [6, 7], // 6
    [4, 7], // 7
    [0, 4], // 8
    [1, 5], // 9
    [2, 6], // 10
    [3, 7], // 11
    
]

// triangulation table created from: https://github.com/KineticTactic/marching-cubes-js
const triTable = [
    [],
    [0,2,1],
    [0,1,2],
    [0,2,1,3,2,0],
    [0,1,2],
    [0,4,3,1,2,5],
    [2,1,3,0,1,2],
    [0,2,1,0,4,2,4,3,2],
    [1,2,0],
    [0,3,1,2,3,0],
    [1,4,0,2,3,5],
    [0,4,1,0,3,4,3,2,4],
    [1,2,0,3,2,1],
    [0,3,1,0,2,3,2,4,3],
    [1,2,0,1,4,2,4,3,2],
    [1,0,2,2,0,3],
    [0,1,2],
    [2,1,0,3,1,2],
    [0,1,5,4,2,3],
    [2,0,4,2,3,0,3,1,0],
    [0,1,5,4,2,3],
    [3,4,5,3,0,4,1,2,6],
    [5,1,6,5,0,1,4,2,3],
    [0,5,4,0,4,3,0,3,1,3,4,2],
    [4,2,3,1,5,0],
    [4,2,3,4,1,2,1,0,2],
    [7,0,1,6,4,5,2,3,8],
    [2,3,5,4,2,5,4,5,1,4,1,0],
    [1,5,0,1,6,5,3,4,2],
    [1,5,4,1,2,5,1,0,2,3,5,2],
    [2,3,4,5,0,7,5,7,6,7,0,1],
    [0,1,4,0,4,2,2,4,3],
    [2,1,0],
    [5,3,2,0,4,1],
    [0,3,2,1,3,0],
    [4,3,2,4,1,3,1,0,3],
    [0,1,5,4,3,2],
    [3,0,6,1,2,8,4,7,5],
    [3,1,4,3,2,1,2,0,1],
    [0,5,3,1,0,3,1,3,2,1,2,4],
    [4,3,2,0,1,5],
    [0,6,1,0,4,6,2,5,3],
    [0,5,4,0,1,5,2,3,6],
    [1,0,3,1,3,4,1,4,5,2,4,3],
    [5,1,6,5,0,1,4,3,2],
    [2,5,3,0,4,1,4,6,1,4,7,6],
    [3,2,0,3,0,5,3,5,4,5,0,1],
    [1,0,2,1,2,3,3,2,4],
    [3,1,2,0,1,3],
    [4,1,0,4,2,1,2,3,1],
    [0,3,4,0,1,3,1,2,3],
    [0,2,1,1,2,3],
    [5,3,4,5,2,3,6,0,1],
    [7,1,2,6,4,0,4,3,0,4,5,3],
    [4,0,1,4,1,2,4,2,3,5,2,1],
    [0,4,2,0,2,1,1,2,3],
    [3,5,2,3,4,5,1,6,0],
    [4,2,3,4,3,1,4,1,0,1,3,5],
    [2,3,7,0,1,6,1,5,6,1,4,5],
    [4,1,0,4,0,3,3,0,2],
    [5,2,4,4,2,3,6,0,1,6,1,7],
    [2,3,0,2,0,4,3,6,0,1,0,5,6,5,0],
    [6,5,0,6,0,1,5,2,0,4,0,3,2,3,0],
    [3,2,0,1,3,0],
    [2,1,0],
    [0,4,1,2,5,3],
    [4,0,1,2,5,3],
    [0,4,1,0,5,4,2,6,3],
    [0,3,2,1,3,0],
    [1,5,4,1,2,5,3,0,6],
    [4,3,2,4,0,3,0,1,3],
    [2,5,4,2,4,0,2,0,3,1,0,4],
    [0,1,5,4,3,2],
    [6,0,4,6,1,0,5,3,2],
    [0,1,6,2,3,8,4,7,5],
    [2,6,3,0,5,1,5,7,1,5,4,7],
    [3,1,4,3,2,1,2,0,1],
    [0,4,5,0,5,2,0,2,1,2,5,3],
    [1,5,3,0,1,3,0,3,2,0,2,4],
    [1,0,3,1,3,4,4,3,2],
    [1,5,2,0,3,4],
    [2,1,0,2,5,1,4,3,6],
    [1,7,0,3,8,4,6,2,5],
    [7,4,3,0,6,5,0,5,1,5,6,2],
    [4,0,1,4,3,0,2,5,6],
    [1,2,5,5,2,6,3,0,4,3,4,7],
    [6,2,5,7,0,3,0,4,3,0,1,4],
    [5,1,6,5,6,2,1,0,6,3,6,4,0,4,6],
    [1,8,0,5,6,2,7,4,3],
    [3,6,4,2,5,1,2,1,0,1,5,7],
    [0,1,9,4,7,8,2,3,11,5,10,6],
    [6,1,0,6,8,1,6,2,8,5,8,2,3,7,4],
    [6,2,5,1,7,3,1,3,0,3,7,4],
    [3,1,6,3,6,4,1,0,6,5,6,2,0,2,6],
    [0,3,7,0,4,3,0,1,4,8,4,1,6,2,5],
    [2,1,4,2,4,5,0,3,4,3,5,4],
    [3,0,2,1,0,3],
    [2,6,3,2,5,6,0,4,1],
    [4,0,1,4,3,0,3,2,0],
    [4,1,0,4,0,3,4,3,2,3,0,5],
    [0,2,4,0,1,2,1,3,2],
    [3,0,6,1,2,7,2,4,7,2,5,4],
    [0,1,2,2,1,3],
    [4,1,0,4,0,2,2,0,3],
    [5,2,4,5,3,2,6,0,1],
    [0,4,1,1,4,7,2,5,6,2,6,3],
    [3,7,2,0,1,5,0,5,4,5,1,6],
    [3,2,0,3,0,5,2,4,0,1,0,6,4,6,0],
    [4,3,2,4,1,3,4,0,1,5,3,1],
    [4,6,1,4,1,0,6,3,1,5,1,2,3,2,1],
    [1,4,3,1,3,0,0,3,2],
    [1,0,2,3,1,2],
    [1,4,0,1,2,4,2,3,4],
    [0,3,1,0,5,3,0,4,5,2,3,5],
    [5,2,3,1,5,3,1,3,4,1,4,0],
    [4,2,3,4,3,0,0,3,1],
    [0,1,2,0,2,4,0,4,5,4,2,3],
    [2,4,6,2,6,1,4,5,6,0,6,3,5,3,6],
    [3,4,0,3,0,2,2,0,1],
    [3,1,0,2,3,0],
    [0,1,7,6,2,4,6,4,5,4,2,3],
    [1,0,3,1,3,6,0,4,3,2,3,5,4,5,3],
    [1,6,0,1,5,6,1,7,5,4,5,7,2,3,8],
    [5,1,0,5,0,3,4,2,0,2,3,0],
    [4,5,2,4,2,3,5,0,2,6,2,1,0,1,2],
    [0,4,1,5,2,3],
    [3,4,0,3,0,2,1,5,0,5,2,0],
    [1,2,0],
    [1,0,2],
    [1,0,4,5,3,2],
    [0,1,4,5,3,2],
    [4,0,5,4,1,0,6,3,2],
    [4,0,1,2,5,3],
    [1,2,7,3,0,6,4,8,5],
    [1,4,0,1,5,4,2,6,3],
    [2,7,3,0,6,1,6,4,1,6,5,4],
    [3,0,1,2,0,3],
    [3,0,4,3,2,0,2,1,0],
    [2,5,4,2,3,5,0,1,6],
    [0,2,1,0,4,2,0,5,4,4,3,2],
    [4,3,2,4,0,3,0,1,3],
    [5,3,2,1,3,5,1,4,3,1,0,4],
    [0,1,3,0,3,5,0,5,4,2,5,3],
    [1,0,4,1,4,2,2,4,3],
    [1,2,0,3,2,1],
    [1,3,4,1,0,3,0,2,3],
    [4,3,6,4,2,3,5,0,1],
    [4,2,3,4,3,1,4,1,0,5,1,3],
    [3,4,2,3,6,4,1,5,0],
    [1,2,6,3,0,7,0,5,7,0,4,5],
    [2,7,4,2,3,7,0,1,5,1,6,5],
    [5,4,1,5,1,0,4,2,1,6,1,3,2,3,1],
    [4,0,1,4,2,0,2,3,0],
    [0,2,1,2,3,1],
    [1,7,0,2,3,4,2,4,5,4,3,6],
    [0,4,2,0,2,1,1,2,3],
    [4,0,1,4,3,0,4,2,3,3,5,0],
    [4,1,0,4,0,3,3,0,2],
    [2,3,1,2,1,4,3,6,1,0,1,5,6,5,1],
    [3,2,0,1,3,0],
    [0,4,1,3,2,5],
    [0,6,1,2,7,3,8,5,4],
    [3,0,1,3,2,0,5,4,6],
    [7,5,4,6,1,2,1,3,2,1,0,3],
    [6,3,2,7,0,1,5,4,8],
    [6,11,7,1,2,10,0,8,3,4,9,5],
    [5,4,7,3,2,6,2,1,6,2,0,1],
    [1,2,6,1,3,2,1,0,3,7,3,0,8,5,4],
    [5,0,1,5,4,0,3,2,6],
    [7,3,2,0,6,4,0,4,1,4,6,5],
    [3,6,2,3,7,6,1,5,0,5,4,0],
    [4,1,6,4,6,5,1,0,6,2,6,3,0,3,6],
    [6,3,2,7,0,4,0,5,4,0,1,5],
    [1,4,8,1,5,4,1,0,5,6,5,0,7,3,2],
    [2,0,6,2,6,3,0,1,6,4,6,5,1,5,6],
    [3,2,5,3,5,4,1,0,5,0,4,5],
    [1,3,0,1,4,3,4,2,3],
    [1,3,5,0,3,1,0,2,3,0,4,2],
    [0,5,4,0,2,5,0,1,2,2,3,5],
    [3,4,1,3,1,2,2,1,0],
    [0,1,6,5,2,7,5,7,4,7,2,3],
    [0,8,3,0,5,8,0,6,5,4,5,6,1,2,7],
    [6,4,2,6,2,3,4,0,2,5,2,1,0,1,2],
    [3,5,1,3,1,2,0,4,1,4,2,1],
    [2,4,5,2,0,4,2,3,0,1,4,0],
    [4,2,3,4,3,0,0,3,1],
    [1,4,6,1,6,0,4,5,6,3,6,2,5,2,6],
    [0,2,3,1,0,3],
    [0,1,3,0,3,6,1,4,3,2,3,5,4,5,3],
    [5,1,0,5,0,3,4,2,0,2,3,0],
    [0,1,4,2,3,5],
    [2,0,1],
    [3,0,2,1,0,3],
    [6,2,5,6,3,2,4,1,0],
    [2,6,3,2,5,6,1,4,0],
    [6,3,2,6,7,3,5,4,0,4,1,0],
    [4,0,1,4,3,0,3,2,0],
    [0,6,3,1,2,5,1,5,4,5,2,7],
    [4,3,2,4,1,3,4,0,1,1,5,3],
    [3,2,0,3,0,6,2,5,0,1,0,4,5,4,0],
    [0,2,4,0,1,2,1,3,2],
    [4,1,0,4,2,1,4,3,2,5,1,2],
    [6,0,1,4,7,3,4,3,5,3,7,2],
    [5,4,1,5,1,0,4,3,1,6,1,2,3,2,1],
    [0,1,2,1,3,2],
    [0,4,3,0,3,1,1,3,2],
    [4,0,1,4,1,2,2,1,3],
    [3,2,1,0,3,1],
    [1,2,0,1,3,2,3,4,2],
    [3,0,2,3,5,0,3,4,5,5,1,0],
    [0,1,5,4,2,6,4,6,7,6,2,3],
    [5,6,2,5,2,3,6,1,2,4,2,0,1,0,2],
    [1,3,0,1,4,3,1,5,4,2,3,4],
    [0,4,6,0,6,3,4,5,6,2,6,1,5,1,6],
    [0,1,3,0,3,5,1,6,3,2,3,4,6,4,3],
    [4,2,3,0,5,1],
    [0,3,5,1,3,0,1,2,3,1,4,2],
    [3,4,1,3,1,2,2,1,0],
    [3,8,2,3,5,8,3,6,5,4,5,6,0,1,7],
    [3,5,1,3,1,2,0,4,1,4,2,1],
    [4,2,3,4,3,1,1,3,0],
    [0,2,3,1,0,3],
    [4,2,3,4,3,1,5,0,3,0,1,3],
    [2,0,1],
    [0,4,1,0,2,4,2,3,4],
    [0,4,1,2,5,3,5,7,3,5,6,7],
    [1,4,5,1,5,2,1,2,0,3,2,5],
    [1,0,2,1,2,4,0,5,2,3,2,6,5,6,2],
    [2,5,3,4,5,2,4,1,5,4,0,1],
    [7,5,4,7,8,5,7,1,8,2,8,1,0,6,3],
    [4,3,2,4,2,1,1,2,0],
    [5,3,2,5,2,0,4,1,2,1,0,2],
    [0,4,5,0,3,4,0,1,3,3,2,4],
    [5,6,3,5,3,2,6,1,3,4,3,0,1,0,3],
    [3,5,6,3,6,2,5,4,6,1,6,0,4,0,6],
    [0,5,1,4,3,2],
    [2,4,0,2,0,3,3,0,1],
    [2,5,1,2,1,3,0,4,1,4,3,1],
    [2,0,1,3,2,1],
    [0,2,1],
    [1,2,0,2,3,0],
    [1,0,2,1,2,4,4,2,3],
    [0,1,3,0,3,2,2,3,4],
    [1,0,2,3,1,2],
    [0,1,4,0,4,3,3,4,2],
    [3,0,4,3,4,5,1,2,4,2,5,4],
    [0,1,3,2,0,3],
    [1,0,2],
    [0,1,2,0,2,4,4,2,3],
    [2,3,1,0,2,1],
    [2,3,4,2,4,5,0,1,4,1,5,4],
    [0,2,1],
    [0,1,2,3,0,2],
    [0,2,1],
    [0,1,2],
    []
]

// takes 3d data (val >= 0) as a 3d array and returns list of vertices (1d float32) and indices (1d uint16) for the mesh
// at the supplied threshold value
var generateMesh = function(data, threshold) {
    //const start = Date.now();
    let verts = [];
    let indices = [];
    let normals = [];

    let dataNormals = [];
    //loop through every cell

    for (let i = 0; i < data.length-1; i++) {
        for (let j = 0; j < data[i].length-1; j++) {
            for (let k = 0; k < data[i][j].length-1; k++) {
                const otherVertLength = verts.length/3;

                // values for cell data points are stored as 1d array
                // index = i + 2*j + 4*k (local coords)
                let cellVals = [];
				let cellVertices = [];

                // generate code for the cell
                var code = 0;
                for (let l = 0; l < 8; l++) {
					
					
					const c = vertCoordTable[l];
					
					const point = data[i + c[0]][j + c[1]][k + c[2]]
                    const val = point[3];
                    
					code |= (val > threshold) << l;
					
					// Note that cell vals don't appear in the order of their vertex name!!
                    cellVals[c[0] + 2*c[1] + 4*c[2]] = val;
					cellVertices[l] = point.slice(0,3);
                }

                // gets appropriate active edges
                let edges = edgeTable[code];

                //calculate factors for each edge (distance from 1st connected vertex in index space)
                const factors = edgesToFactors(edges, cellVals, threshold);

                //turns edge list into coords
                // const theseVerts = edgesToCoords(edges, [i, j, k], [1,1,1], factors);
				const theseVerts = edgesToCoords2(cellVertices, edges, factors);
                
                //create entries for indicies list
                const tri = triTable[code];
                let theseIndices = tri.map(a => a + otherVertLength);

                //calculate normal vector for each vertex

                verts.push(...theseVerts);
                indices.push(...theseIndices);
                //normals.push(...theseNormals);
            }
        }
    }
    //console.log("mesh generation took: ", Date.now() - start);
    return {verts:verts, indices:indices, normals:normals};
} // generateMesh




var generateMeshVTK = function(data, threshold) {
	// Adaptation of generateMesh for data that comes as lists of vertices and connectivity.
	
    //const start = Date.now();
    let verts = [];
    let indices = [];
    let normals = [];

    let dataNormals = [];
    //loop through every cell

    for (let i = 0; i < data.connectivity.length; i++) {
       
		const otherVertLength = verts.length/3;

		// values for cell data points are stored as 1d array
		// index = i + 2*j + 4*k (local coords)
		let cellVals = [];
		let cellVertices = [];

		// generate code for the cell
		var code = 0;
		for (let l = 0; l < 8; l++) {
			
			
			const c = vertCoordTable[l];
			
			const vert = data.vertices[ data.connectivity[i][l] ];
			const val  = data.mach[ data.connectivity[i][l] ];;
			
			code |= (val > threshold) << l;
			
			// Note that cell vals don't appear in the order of their vertex name!!
			cellVals[c[0] + 2*c[1] + 4*c[2]] = val;
			cellVertices[l] = vert;
		}

		// gets appropriate active edges
		let edges = edgeTable[code];

		//calculate factors for each edge (distance from 1st connected vertex in index space)
		const factors = edgesToFactors(edges, cellVals, threshold);

		//turns edge list into coords
		// const theseVerts = edgesToCoords(edges, [i, j, k], [1,1,1], factors);
		const theseVerts = edgesToCoords2(cellVertices, edges, factors);
		
		//create entries for indicies list
		const tri = triTable[code];
		let theseIndices = tri.map(a => a + otherVertLength);

		//calculate normal vector for each vertex

		verts.push(...theseVerts);
		indices.push(...theseIndices);
		//normals.push(...theseNormals);
          
    }
    //console.log("mesh generation took: ", Date.now() - start);
    return {verts:verts, indices:indices, normals:normals};
} // generateMeshVTK




var edgesToFactors = (edges, cellVals, threshold) => {
    let factors = [];
    for (let i = 0; i < edges.length; i++) { 
        let verts = edgeToVertsTable[edges[i]]
        let a = vertCoordTable[verts[0]]; 
        let b = vertCoordTable[verts[1]];

        // get interpolation factor
        // get values at connected vertices
        const va = cellVals[a[0] + 2*a[1] + 4*a[2]];
        const vb = cellVals[b[0] + 2*b[1] + 4*b[2]];
        factors.push((threshold-va)/(vb-va));
    }
    return factors;
}

// interpolates between 2 coords
var interpolateCoord = (a, b, fac) => {
    let final = []
    for (let i = 0; i < a.length; i++) {
        final[i] = (a[i]*(1-fac) + b[i]*(fac))
    }
    return final;
}

// cellCoord is coord of 0 vertex in cell
// preserves order
var edgesToCoords = (edges, cellCoord, cellDims, factors) => {
    let coords = [];
    // loop through each edge
    for (let i = 0; i < edges.length; i++) { 

        // get verts associated with it
        let verts = edgeToVertsTable[edges[i]]
        // get coords of that vert in index space
        let a = vertCoordTable[verts[0]]; 
        let b = vertCoordTable[verts[1]];
        // pass into interpolate coords
        // add to coords list
        coords.push(...VecMath.vecAdd(VecMath.vecMult(interpolateCoord(a, b, factors[i]), cellDims), cellCoord));
    }
    return coords;
}



// This needs to be adjusted to return coordinates based on data vertex coordinates as opposed to indices.
var edgesToCoords2 = (vertices, edges, factors) => {
    let coords = [];
    // loop through each edge
    for (let i = 0; i < edges.length; i++) { 

        // edgeToVertsTable returns 2 indices of the 2 vertices that make up a particular edge of a reference cube cell. These indices must be further converted into the actual coordinates.
        let verts = edgeToVertsTable[edges[i]]
        
		// Convert the reference cube vertex indices to 3d reference cube mesh indices.
        let a = vertices[verts[0]];
        let b = vertices[verts[1]];;
		
		
		// Push interpolated vertices to coords.
        coords.push( ...interpolateCoord( a, b, factors[i] ) );
    }
    return coords;
}


var generateDataNormals = function(data, cellSize) {
    let normals = [];
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            for (let k = 0; k < data[i][j].length; k++) {
                let dx, dy, dz;
                // x(i) component
                if (i > 0) {
                    if (i < data.length - 1){
                        dx = (data[i+1][j][k] - data[i-1][j][k])/cellSize[0]
                    } else {
                        dx = (data[i+1][j][k] - data[i][j][k])/(2*cellSize[0])
                    }
                } else {
                    dx = ((data[i][j][k] - data[i][j][k])/(2*cellSize[0]))
                }
                // y(j) component
                if (i > 0) {
                    if (i < data.length - 1){
                        dy = (data[i+1][j][k] - data[i-1][j][k])/cellSize[0]
                    } else {
                        dy = (data[i+1][j][k] - data[i][j][k])/(2*cellSize[0])
                    }
                } else {
                    dy = ((data[i][j][k] - data[i][j][k])/(2*cellSize[0]))
                }
                // z(k) component
                if (i > 0) {
                    if (i < data.length - 1){
                        dz = (data[i+1][j][k] - data[i-1][j][k])/cellSize[0]
                    } else {
                        dz = (data[i+1][j][k] - data[i][j][k])/(2*cellSize[0])
                    }
                } else {
                    dz = ((data[i][j][k] - data[i][j][k])/(2*cellSize[0]))
                }
            }
        }
    }
}

// for generating tables and checking values: -----------------------------------------------------------------------------------

// returns list of active edges for the specific vertex code
var edgesFromCode = (code) => {
    const v0 = (code & 1<<0) && true;
    const v1 = (code & 1<<1) && true;
    const v2 = (code & 1<<2) && true;
    const v3 = (code & 1<<3) && true;
    const v4 = (code & 1<<4) && true;
    const v5 = (code & 1<<5) && true;
    const v6 = (code & 1<<6) && true;
    const v7 = (code & 1<<7) && true;

    verts = [v0, v1, v2, v3, v4, v5, v6, v7];

    let edges = [];
    for (let i = 0; i < 12; i++) {
        let thisVerts = edgeToVertsTable[i]
        if (verts[thisVerts[0]] ^ verts[thisVerts[1]]) edges.push(i);
    }
    return edges;
}

var generateEdgeTable = () => {
    let table = []
    for (i = 0; i < 256; i++) {
        table[i] = edgesFromCode(i);
    }
    return table;
}

const generateRelTriTable = () => {
    let table = [];
    for (i = 0; i < 256; i++) {
        const edges = edgeTable[i];
        const tri = triangulationTable[i];
        // relative triangulation
        let theseIndices = [];
        for (let i = 0; i < tri.length; i++) {
            if (tri[i] == -1) break;
            theseIndices.push(edges.indexOf(tri[i]));
        }
        table[i] = theseIndices;
    }
    return table;
}

