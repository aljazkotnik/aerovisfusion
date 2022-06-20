AIAA 2023 Deadline: 
1 June 2022 2000 hrs EDT - 1am Cambridge time

VISION: A collaborative scalable interactive 3D viewing environment capable of incorporating streaming sensor data, and usable in a AR environment.


COMPONENTS:
Components have independent demos for ease of development.

INTERACTIVE TAGGING:
The demo is set in space because the geometry creation was easy. The user can position yellow glowing annotation spheres on top of the box-satellites by clicking on them. Positioning of spheres in free space is not activated in this demo. By activating the sponge button the user can enter the mode in which clicking on hte box satellites removes the spheres.

To adjust the depth/radius of individual spheres the user must first select the sphere to adjust. By clicking on a sphere its glow turns red indicating that it is selected. The sliders in the top right corner work as incremental controls - grabbing the handle and moving it left adds a negative increment to the relevant property for each change in the input state. This allows for coarse adjustments in the extreme position, and fine adjustments near the center. After letting go the controls re-center.


STREAMLINES:
This demo uses the delta wing data collected in the Flow Visualisation ExA. CFD is one of the data streams, and to capture knowledge about it some of it must be visualised. This could be a good opportunity to showcase some of Thanassis' work also.

The movement of the 'streamlets' (streamline particle) encodes local flow direction, the color encodes the local Mach number, the length encodes the velocity magnitude. More specifically, the length is the distance that the leading point of the streamlet travelled in the last five re-renders. We've seen a similar visualisation before: a global wind visualisation app PolarGlobe (in the PPD report). Similarly ParaView supports drawing of streamlets. The disadvantage of both the PolarGlobe and ParaView approaches is that for every camera change the seeds need to be reinitialised, and the trace is lost. Furthermore, PolarGlobe selects points in the domain and just adds the local velocity times a delta time to the current point. The delta time is used to control the speed of the animation, but changing it means that the streamlines potentially change also - the authors themselves noted this in their paper.

My approach relies on ParaView to calculate some streamlines, which I save into a csv file, and subsequently load into the JavaScript environment. The animation is created by only rendering n-points (n=5) at once, and sequentially changing which n vertices are connected with the line. In contrast to the PolarGlobe the vertices to be drawn are on a fixed line, therefore the shape of the line is preserved regardless of animation speed. 

The vertices to be drawn are re-set on every render draw to create the animation. However, camera navigation events trigger additional render calls, which means that camera navigation accelerates the animation. To correct for this the streamline updating can be limited to one draw for a given timestep.

ParaView does not export points along streamlines at the same integration timesteps - this means that the velocity encoding as length is not really true, as streamlets with larger dt between their constitutive point will artificially appear faster. To address this the ParaView csv data can be re-interpolated to find points comparable timesteps apart.


Another approach is to prescribe the global integration time to all lines, and allow the closest timestep to be selected as the first point of the streamlet. Then a common time offset can be used to find the last streamlet point. This will still not accurately capture integrated velocity as length, because of the need to find the closest timestep, which depends on discretisation.

Controlling the animation speed. Using the debounced indexing approach the minimum speed relies on the discretisation - if the streamlet refresh rate is too low the streamlets will not move smoothly. Furthermore, the maximum speed is also limited by the discretisation - for very high streamline refresh rates the streamlines are updated every render call, which just advances the index by one, hence the discretisation controls the maximum speed.

Another consideration is the framerate, which is not always consistent. Therefore to be able to track particles in real time the time prescription method is more applicable. As mentioned above this also controls the speed at which the streamlet advances through the domain. By prescribing two timesteps the start and finish of the streamlet can be defined, which can allow the length of the streamlet to be better controlled. Discretisation still plays a role, as it determines the resolution.

Streamlines in ParaView were created using the sphere seed geometry: ParaView selects n random intitial streamline positions within the sphere, and starts moving down and upstream of these points to find the lines. Because the streamlines all start relatively close together the streamlets also start together, and move through the domain togehter. Although such a visualisation may be useful, to visualise the entire flow field with moving streamlines the streamlets need to be offset.

Fade in, and fade out are controlled by controlling the indexing.



FUTURE WORK
One apparent aspect of ParaView animated streamlets is that they occupy the entire domain, and that the user cannot (is this true?) control the seeding. Streamlet seeding is a similar problem to sampling, e.g. selecting points for traverse measurements. GPR (Gaussian Process Regression) is a common statistical technique that can be applied to determine the locations with the highest/lowest uncertainties, which can help identifiy valuable sampling points. GPR can therefore be used to place streamlets in the most uncertain points of the velocity field, which are the domain points with the largest velocity changes. Maybe a good first approach is to create a model in Matlab and load the line selection in, as opposed to doing it on the fly.


The application we are making can also be seen as the 3D small multiple rendering inset - much like the unsteady turbine example was a 2D inset. A large part of that work was data handling, and in this project we have the time to attempt to use compressed data that is uncompressed on the GPU. Thanassis already worked on extracting only subsets of relevant 3D data. In addition we could also attempt to perform data tiling. This section of the title could be framed as a challenge to find the largest CFD simulation possible to visualise in the browser. Again we can discuss the idea of 4GB per screen area.







MISCELLANEOUS:
Try to implement virtual smoke visualisation by seeding particles. The particles move along streamlines, but implicitly - their path is influenced at every step. By adjusting their weight, and subsequently inertia the impact of hte differences in fluid properties (smoke vs air) could be assessed.

Ultimately the entry point for the user is the dbslice dash. The user filters out subsets, and observes high level data behavior. Then through the data levels they arrive to the detailed data. At the detailed data the actual flow insights are gathered.

A design, or concept exploration process is done step by step, and new data is generated every step. The web based dbslice available to users should have an option to upload new data on-the-go. Maybe the metadata can be stored in a background SQL database. An initial query can be made to retrieve all the tasks, at which point the crossfilter indexing is set up to support the interactions.

Datetime of the simulation should be a parameter in dbslice, that way new users can see the progression of the designs. Maybe as a time?