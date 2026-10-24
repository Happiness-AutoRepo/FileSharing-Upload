"use strict";
(() => {
  const repo = "Happiness-AutoRepo/FileSharing";
  const max = 5 * 1024 * 1024;
  const types = new Set(["pdf","docx","xlsx","pptx","txt","csv","jpg","jpeg","png","zip","java"]);
  const token = document.querySelector("#token");
  const files = document.querySelector("#files");
  const check = document.querySelector("#checkAccess");
  const submit = document.querySelector("#uploadButton");
  const output = document.querySelector("#result");
  const api = "https://api.github.com/repos/" + repo;
  const headers = value => ({
    "Authorization": "Bearer " + value,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json"
  });
  const say = value => { output.textContent = value; };
  async function message(response) {
    let result = "GitHub HTTP " + response.status;
    try {
      const data = await response.json();
      if (typeof data.message === "string") result += ": " + data.message;
    } catch (_) {}
    return result;
  }
  function networkError(e) {
    return e instanceof TypeError
      ? "The browser could not complete the GitHub API request. Check its Network panel or workplace security restrictions."
      : (e.message || "Unknown error");
  }
  async function checkRead(value) {
    const response = await fetch(api, {headers: headers(value), cache:"no-store"});
    if (!response.ok) throw new Error(await message(response));
  }
  function base64(bytes) {
    const parts = [];
    for (let i=0; i<bytes.length; i+=8192) {
      parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
    }
    return btoa(parts.join(""));
  }
  check.addEventListener("click", async () => {
    const value = token.value.trim();
    if (!value) { say("Enter a token first."); return; }
    check.disabled = true;
    say("Testing access...");
    try {
      await checkRead(value);
      say("GitHub read access confirmed. Write permissions are not yet tested.");
    } catch (e) { say(networkError(e)); }
    finally { check.disabled = false; }
  });
  document.querySelector("#uploadForm").addEventListener("submit", async e => {
    e.preventDefault();
    const value = token.value.trim();
    const chosen = Array.from(files.files);
    if (!value || !chosen.length) return;
    check.disabled = submit.disabled = true;
    let sent = 0;
    say("Uploading...");
    const lines = [];
    try {
      for (const file of chosen) {
        const name = file.name.replace(/[/\\]/g,"_").replace(/[^a-zA-Z0-9._() -]/g,"_").slice(0,100);
        const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
        if (!types.has(ext) || file.size===0 || file.size>max) {
          lines.push(file.name + ": unsupported file type or size"); continue;
        }
        try {
          const month = new Date().toISOString().slice(0,7);
          const date = new Date().toISOString().replace(/\D/g,"").slice(0,14);
          const path = "uploads/browser-" + month + "/" + date + "-" + crypto.randomUUID().slice(0,8) + "-" + name;
          const url = api + "/contents/" + path.split("/").map(encodeURIComponent).join("/");
          const content = base64(new Uint8Array(await file.arrayBuffer()));
          const response = await fetch(url,{
            method:"PUT",
            headers:headers(value),
            body:JSON.stringify({message:"Browser file upload: " + name, content, branch:"main"}),
            cache:"no-store"
          });
          if (!response.ok) throw new Error(await message(response));
          sent++;
          lines.push(file.name + ": uploaded");
        } catch (e) { lines.push(file.name + ": " + networkError(e)); }
        say(lines.join("\n"));
      }
      say(sent + " of " + chosen.length + " uploaded.\n" + lines.join("\n"));
      if (sent === chosen.length) files.value = "";
    } finally {
      token.value = "";
      check.disabled = submit.disabled = false;
    }
  });
})();
