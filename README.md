AIAA 2023 Deadline: 
1 June 2022 2000 hrs EDT - 1am Cambridge time

VISION: A collaborative scalable interactive 3D viewing environment capable of incorporating streaming sensor data, and usable in a AR environment.


A group of users filters through hierarchical dataset detail levels using interactive dbslice charts. They arrive at a group of interest, and discuss the 3D unsteady visualisations on-the-go. To support the discussion they create 3D annotations, which they can then compare. The 3D annotations they create are associated with specific timestamps, and a single geometrical annotation can have geometries captured at several timestamps - therefore the changes of the features can be highlighted as well. They focus on a specific example, and proceed by adding the experimental data (which can also be seen as the next level of detail). The data includes pressure tapping info, hotwire measurements, ..., which are visualised as vectors. The users wish to include visual experimental techniques, such as flow visualisation paint, smoke visualisation, or surface tufts, which were made by one of the users using their phone camera. The users annotate the region of interest in the captured image, and the corresponding surface area in the CFD domain. The area on the image is used as a texture to be mapped onto the surface selected in the CFD dimain. The combination of all data in one environment also allows them to quickly spot mismatches between data sources. 

AR Aspect:
The users decide to use this particular design as a baseline for further work, and wish to use a rapid prototyping work process to make improvements. They 3D print the selected design, and install it in the test section. To aid the experimental process they bring along an iPad, open the browser based <>somename<> app that allows them to view the CFD, and position the viewpoint camera of the viewer by scanning QR codes at predetermined points around the experimental apparatus. To test the software they walk around the apparatus and inspect the CFD solution within the apparatus itself, using hte iPad as a virtual window into the apparatus. When the experiment starts the data collected by the apparatus (pressure tappings, hot wire data,...) is streamed to the server, and onwards to the client iPad, where the <>somename<> app visualises it alongside the CFD solution. A manual visualisation mode allows the user to virtually navigate around the apparatus in cases where the apparatus is large. 



TERMS:
Collaborative: making 3D annotations and showing all annotations in a tree, and sidebar commenting system.
Scalable: the VA environment, but with 3D modules.
Interactive: Surface threshold updated on the go.
Sensor fusion: Connect to sensor collecting the data
AR visualisation: visualise the CFD, sensor data in the actual wind tunnel.


REQUIREMENTS:
Collaborative: 
- connect to a server using WebSockets
- embedding a tree visualisation
- embedding a commenting system

Scalable:
- Base on THREE.js - learn THREE.js
- Make THREE.js module compatible with the VA system

Interactive:
- Combine Thanassis' work. How will it interface with THREE.js visualisations?

Sensor fusion:
- How to stream data from the data acquisition card to the server, and further to the clients?

AR visualisation:
- Combine the AR framework and see if the visualisation works on an iPad




MISCELLANEOUS:
Ultimately the entry point for the user is the dbslice dash. The user filters out subsets, and observes high level data behavior. Then through the data levels they arrive to the detailed data. At the detailed data the actual flow insights are gathered.

A design, or concept exploration process is done step by step, and new data is generated every step. The web based dbslice available to users should have an option to upload new data on-the-go. Maybe the metadata can be stored in a background SQL database. An initial query can be made to retrieve all the tasks, at which point the crossfilter indexing is set up to support the interactions.

Datetime of the simulation should be a parameter in dbslice, that way new users can see the progression of the designs. Maybe as a time?