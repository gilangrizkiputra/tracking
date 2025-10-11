import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name } = await req.json();
    if (!name)
      return res.status(400).json({ message: "Missing participant name" });

    const token = process.env.GITHUB_TOKEN;
    const username = "Herbs";
    const repo = "tracking";
    const filePath = "participants.json";

    const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;

    const getFile = await fetch(url, {
      headers: { Authorization: `token ${token}` },
    });
    const fileData = await getFile.json();

    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    const participants = JSON.parse(content);

    const updatedParticipants = participants.map((p) =>
      p.name === name ? { ...p, manual_done: true } : p
    );

    const updatedContent = Buffer.from(
      JSON.stringify(updatedParticipants, null, 2)
    ).toString("base64");

    const update = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `✅ Mark ${name} as done (via web)`,
        content: updatedContent,
        sha: fileData.sha,
      }),
    });

    if (update.ok) {
      return res
        .status(200)
        .json({ success: true, message: `${name} marked as done` });
    } else {
      const error = await update.json();
      return res.status(500).json({ success: false, error });
    }
  } catch (err) {
    console.error("❌ Error mark done:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
