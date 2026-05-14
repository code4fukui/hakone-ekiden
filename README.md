# Hakone Ekiden 3D Viewer

> 日本語のREADMEはこちらです: [README.ja.md](README.ja.md)

A real-time 3D digital map of the Hakone Ekiden, a famous university relay marathon in Japan. This project visualizes the entire race course, tracks runner positions, and displays team information on an interactive 3D map.

This repository is based on the original "Hakone Ekiden 3D" project by Akihiko Kusanagi ([@nagix](https://twitter.com/nagix)). See original work: [nagix.github.io/hakone-ekiden/](https://nagix.github.io/hakone-ekiden/).

## Demo

See a [Live Demo](https://code4fukui.github.io/hakone-ekiden/).

## Features

-   **Real-time 3D Race Visualization:** Renders the full Hakone Ekiden course (outbound and return legs) on a 3D terrain map using Mapbox GL JS.
-   **Live Runner Tracking:** Displays the position of each team's runner, with data updated automatically every 10 seconds during the event.
-   **Animated 3D Models:** Each runner is represented by an animated 3D model (`runner.glb`) textured with their university's uniform.
-   **Multiple Camera Perspectives:** Switch between various tracking modes, including drone, helicopter, and first-person views, to follow the race.
-   **Detailed Course Information:** Pop-ups show checkpoints, start/finish lines, and relay stations as defined in `data/sections.json`.

## How It Works

The application uses Mapbox GL JS for the base map and integrates THREE.js to render animated 3D runners as a custom layer. Course, team, and elevation data are loaded from local JSON files. During the race, live runner location data is fetched from an external endpoint.

-   **Course Data:** `data/routes.json` contains the geo-coordinates for the race routes.
-   **Team Data:** `data/teams.json` lists the participating universities and their runner rosters (for the 2022 race).
-   **Checkpoints:** `data/sections.json` defines the official relay stations.
-   **Elevation:** `data/distances.json` provides the elevation profile for the course.

## Local Development

This project is a static web application and does not require a build step or package manager.

1.  Clone the repository:
    ```sh
    git clone https://github.com/code4fukui/hakone-ekiden.git
    ```
2.  Navigate to the project directory:
    ```sh
    cd hakone-ekiden
    ```
3.  Start a local web server. For example, using Python:
    ```sh
    python -m http.server
    ```
4.  Open your browser and go to `http://localhost:8000` (or the port your server uses).

## License

Hakone Ekiden 3D is available under the [MIT license](https://opensource.org/licenses/MIT).