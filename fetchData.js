import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import participants from "./participants.json" assert { type: "json" };

dotenv.config();
const headers = { Authorization: `token ${process.env.GITHUB_TOKEN}` };

// fungsi ambil total commit
async function getTotalCommits(username, repo) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${username}/${repo}/commits?per_page=1`,
      { headers }
    );

    // ambil header 'Link' buat hitung total commit
    const linkHeader = res.headers.get("link");

    if (!linkHeader) {
      const single = await res.json();
      return Array.isArray(single) ? single.length : 0;
    }

    // ambil angka terakhir dari pagination
    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
    const totalCommits = match ? parseInt(match[1]) : 0;

    return totalCommits;
  } catch (err) {
    console.error(`❌ Error ambil data ${repo}:`, err.message);
    return 0;
  }
}

async function main() {
  const results = [];

  for (const p of participants) {
    console.log(`📦 Fetching data for ${p.name}...`);

    const totalCommits = await getTotalCommits(p.username, p.repo);
    const target = p.project_done_commit || 30; // default target 30 commit
    const commitProgress = Math.min((totalCommits / target) * 100, 100);
    const progress = p.manual_done ? 100 : Math.round(commitProgress);

    let status = "On Progress 🔧";
    if (progress >= 100) status = "Done ✅";
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

  fs.writeFileSync("./data/progress.json", JSON.stringify(results, null, 2));
  console.log("✅ Progress updated! Lihat hasil di data/progress.json");
}

main();
