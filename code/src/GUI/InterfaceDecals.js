import { html2element } from "../helpers.js";
import Stats from "stats.js";

import IncrementController from "./IncrementController.js";
import ToggleButton from "./ToggleButton.js";


//  <button class="icon add">🎯</button>
//	<button class="icon edit">🔧</button>

// This template should be abstracted within the HUD class to allow dynamic creation, much like the GUI library. The GUI library is not used because I need some additional functionality, like hte incremenal controller. But for example the color picker from GUI is amazing.
let template = `
<div style="position: fixed;">
  <div class="stats"></div>
  <div class="controls" style="position: fixed; top: 10px; float: right; right: 10px;"></div>
</div>
`;


/*
The decals are roughly positioned by pointing and clicking. After that their (1) position, (2) orientation, and (3) size may need to be adjusted.

(1) Position:
	The decal position is determined by the positioning of a 3D clipping box, which is itself positioned using an xyz triplet. The decal therefore itself is positioned using three dimensions. Then the user needs to keep track of the world orientation to use them correctly. If instead we want the user to orientate the decals based on the screen vertical and horizontal directions, the screen coordinate system needs to be transformed to the world corrdinate system, and the change in position applied there.
	In practice when the user adjusts the increment, the on-screen coordinates of the raycaster used for placement need to be retrieved, the increment applied to them, and the decal geometry adjusted. 
(2) Orientation:
    Orientation is easier, as two angles are defined by the geometry, and only orientation on the geometry is really needed - we don't want to angle the image in other directions for now - although this could be used for images that were not taken head-on.
(3) Size:
	Easiest - controlled by a single scalar.
	
	
	

Perhaps it's easier if a whole new control is introduced for positioning? Like the `plus' controller. Or should they just be repositioned using click positioning? Perhaps a way to do it is to allow the user to place a reference point, and then use that to reposition the decal? Would also be a nice discreet operation. Okay, but then decal selection needs to be implemented. Maybe through a toggle button? Or should the aiming change color if a certain time passes and the cursor is stationary? But this won't work without a mouse. 
What about click and drag? This is similar to the additional reference point and then click to reposition.
Longclick on decal? And then delete when the button is pressed? So the button no longer needs to be a toggle button.
	
	
First the brute force approach - recompute the mesh
Alternately - pad the image to control the size and rotation of the decal?
*/
export default class InterfaceDecals{
	
  erase = false;
	
  constructor(){
	let obj = this;
	obj.node = html2element( template );
	
	
	// Add the Stats object.
	obj.stats = new Stats();
	obj.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
	obj.node.querySelector("div.stats").appendChild( obj.stats.dom );
	
	
	
	// ABSTRACT AWAY!!
	let controlsdiv = obj.node.querySelector("div.controls");
	
	
	// The inputs are used as controllers - -1 is negative and +1 is positive increment.
	obj.rotation = new IncrementController("Rotation");
	controlsdiv.appendChild(obj.rotation.node);
	controlsdiv.appendChild( document.createElement("br") )
	
	obj.size = new IncrementController("Size");
    controlsdiv.appendChild(obj.size.node);
	controlsdiv.appendChild( document.createElement("br") )
	
	// The buttons for handling annotation spheres.
	obj.eraser = new ToggleButton();
	controlsdiv.appendChild(obj.eraser.node);
		
  } // constructor
  
} // InterfaceDecals