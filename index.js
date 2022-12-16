import express from "express";
import bodyParser from "body-parser";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const hashes = {};

app.use(async (req, res, next) => {
  let accessToken = req.get(process.env.SESSION_KEY);

  if (accessToken) {
    if (!hashes[accessToken]) {
      try {
        const userProfile = await fetch("https://kpi.eu.auth0.com/userinfo", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userProfileData = await userProfile.json();

        req.userProfile = userProfileData;
        hashes[accessToken] = userProfileData;
      } catch (error) {
        console.log("error: ", error);
      }
    } else {
      req.userProfile = hashes[accessToken];
    }
  }

  next();
});

app.get("/", (req, res) => {
  if (req.userProfile) {
    return res.json({
      username: req.userProfile.name + " " + req.userProfile.nickname,
      logout: "http://localhost:3000/logout",
    });
  }
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;

  try {
    const options = {
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      realm: "Username-Password-Authentication",
      username: login,
      password,
      scope: "offline_access",
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    };

    let formBody = [];
    for (var property in options) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(options[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");

    const response = await fetch("https://kpi.eu.auth0.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody,
    });
    const data = await response.json();

    if (data && data.access_token) {
      return res.json({ token: data.access_token });
    }

    res.status(401).send();
  } catch (error) {
    console.log("error: ", error);
    res.status(401).send();
    return;
  }

  res.status(401).send();
});

app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${process.env.PORT}`);
});
