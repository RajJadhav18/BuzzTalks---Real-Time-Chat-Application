# BuzzTalks

BuzzTalks is a small real-time chat room built with Express and Socket.IO. The server delivers the web app and handles chat connections from the same origin, so the frontend and WebSocket endpoint can be deployed together.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The production command is `npm start`; the server uses the `PORT` environment variable provided by the host.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New → Blueprint** and connect the repository. Render reads `render.yaml` to create the web service.
3. Wait for the deploy to finish, then open the service URL and try the chat in two browser sessions.

The single Node web service serves the site and Socket.IO on one port. Do not deploy the HTML as a static site by itself: real-time chat needs the running Node service. Render's free web services may spin down when idle, so the first visit after a quiet period can take longer while the service starts.

To host the frontend on a separate origin, set `CLIENT_ORIGIN` on the server to that exact frontend origin (for example, `https://chat.example.com`) and point the frontend's Socket.IO client at the server URL. The default setup is same-origin and needs no extra CORS configuration.

## Notes

- The current room is ephemeral: chat history and online users live in server memory and reset when the service restarts. Add a persistent store if messages need to survive restarts.
- Set up a custom domain in the hosting provider if you want a permanent public URL. The former `glitch.me` project URL cannot host this app now that Glitch project hosting has ended.
- `/health` returns a small health-check response for the hosting platform.
