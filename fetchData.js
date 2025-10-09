import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import participants from "./participants.json" assert { type: "json" };

dotenv.config();
const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };

// Fungsi ambil total commit dari GitHub
async function getTotalCommits(username, repo) {
  const url = `https://api.github.com/repos/${username}/${repo}/commits?per_page=1`;

  for (let i = 0; i < 3; i++) {
    // retry 3x kalau GitHub lagi delay
    try {
      const res = await fetch(url, { headers });

      if (!res.ok) {
        console.warn(`⚠️ [${username}/${repo}] Response: ${res.status}`);
        await new Promise((r) => setTimeout(r, 2000)); // tunggu 2 detik, coba lagi
        continue;
      }

      const linkHeader = res.headers.get("link");

      if (!linkHeader) {
        const single = await res.json();
        return Array.isArray(single) ? single.length : 0;
      }

      const match = linkHeader.match(/page=(\d+)>; rel="last"/);
      const totalCommits = match ? parseInt(match[1]) : 0;

      return totalCommits;
    } catch (err) {
      console.error(`❌ Error ambil data ${repo}:`, err.message);
      await new Promise((r) => setTimeout(r, 2000)); // retry delay
    }
  }

  console.warn(`❌ Gagal ambil data commit dari ${repo} setelah 3 percobaan.`);
  return 0;
}

async function main() {
  const results = [];

  for (const p of participants) {
    console.log(`📦 Fetching data for ${p.name}...`);

    const totalCommits = await getTotalCommits(p.username, p.repo);
    const target = p.project_done_commit || 30; // default target 30 commit
    const commitProgress = Math.min((totalCommits / target) * 100, 100);

    // 🔥 Logic manual_done & progress
    const progress = p.manual_done ? 100 : Math.round(commitProgress);

    // 🔥 Status dinamis
    let status = "On Progress 🔧";
    if (p.manual_done) status = "Done ✅ (manual)";
    else if (progress >= 100) status = "Done ✅";
    else if (progress >= 75) status = "Almost There 🚀";
    else if (progress >= 50) status = "Halfway ⚡";
    else if (progress < 10) status = "Starting 🪄";

    results.push({
      name: p.name,
      repo: p.repo,
      total_commits: totalCommits,
      progress,
      status,
    });
  }

  // Simpan hasil ke progress.json
  fs.writeFileSync("./data/progress.json", JSON.stringify(results, null, 2));
  console.log("✅ Progress updated! Lihat hasil di data/progress.json");
}

main();
