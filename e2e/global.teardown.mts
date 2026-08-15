import { createClerkClient } from "@clerk/backend";
import { test as teardown } from "@playwright/test";
import fs from "fs";
import path from "path";

const usersFile = path.join(import.meta.dirname, "..", "playwright", ".clerk", "created-users.json");

teardown("cleanup test users", async () => {
  if (!fs.existsSync(usersFile)) return;

  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const users: { userId: string; email: string }[] = JSON.parse(
    fs.readFileSync(usersFile, "utf-8"),
  );

  for (const { userId, email } of users) {
    try {
      await client.users.deleteUser(userId);
    } catch {
      const { data } = await client.users.getUserList({ emailAddress: [email] });
      for (const user of data) await client.users.deleteUser(user.id);
    }
  }

  fs.unlinkSync(usersFile);
});
