-- The server stores only public keys, public salts and ciphertext for private chats.
ALTER TABLE "users" ADD COLUMN "encryptionPublicKey" TEXT;
ALTER TABLE "chats" ADD COLUMN "encryptionSalt" TEXT;
ALTER TABLE "messages" ADD COLUMN "isEncrypted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_members" ADD COLUMN "encryptedChatKey" TEXT;
