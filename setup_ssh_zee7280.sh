#!/bin/bash

# 1. Generate new SSH key for Zee7280 (no passphrase for convenience)
echo "Generating new SSH key for Zee7280..."
ssh-keygen -t ed25519 -C "zee7280" -f ~/.ssh/id_zee7280_github -N ""

# 2. Add to SSH config
echo "Configuring ~/.ssh/config..."
mkdir -p ~/.ssh
touch ~/.ssh/config

# Check if config already exists to avoid duplicate
if ! grep -q "github-zee7280" ~/.ssh/config; then
cat <<EOT >> ~/.ssh/config

# Account: Zee7280 (Personal)
Host github-zee7280
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_zee7280_github
  IdentitiesOnly yes
EOT
fi

# 3. Update Git Remote to use the new Host alias
echo "Updating git remote..."
git remote set-url origin git@github-zee7280:Zee7280/ciel_frontend.git

echo "-------------------------------------------------------"
echo "DONE! Now, follow these final steps:"
echo "1. Copy the key below:"
echo "-------------------------------------------------------"
cat ~/.ssh/id_zee7280_github.pub
echo "-------------------------------------------------------"
echo "2. Go to https://github.com/settings/keys"
echo "3. Click 'New SSH Key', give it a title (e.g., 'Macbook Personal'), and paste the key."
echo "4. Try pushing again with 'git push origin main'"
