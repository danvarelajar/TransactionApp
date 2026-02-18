#!/bin/bash
# Helper script to add domain entries to /etc/hosts
# Usage: ./setup-hosts.sh [payment_domain] [attacker_domain]

PAYMENT_DOMAIN=${1:-payment.fortinet.demo}
ATTACKER_DOMAIN=${2:-attacker.fortinet.demo}

HOSTS_FILE="/etc/hosts"
TEMP_FILE=$(mktemp)

echo "Adding domains to $HOSTS_FILE:"
echo "  - $PAYMENT_DOMAIN"
echo "  - $ATTACKER_DOMAIN"
echo ""

# Check if entries already exist
if grep -q "$PAYMENT_DOMAIN" "$HOSTS_FILE" 2>/dev/null; then
    echo "⚠️  $PAYMENT_DOMAIN already exists in $HOSTS_FILE"
else
    echo "127.0.0.1    $PAYMENT_DOMAIN" >> "$HOSTS_FILE"
    echo "✅ Added $PAYMENT_DOMAIN"
fi

if grep -q "$ATTACKER_DOMAIN" "$HOSTS_FILE" 2>/dev/null; then
    echo "⚠️  $ATTACKER_DOMAIN already exists in $HOSTS_FILE"
else
    echo "127.0.0.1    $ATTACKER_DOMAIN" >> "$HOSTS_FILE"
    echo "✅ Added $ATTACKER_DOMAIN"
fi

echo ""
echo "Done! You can now start Docker with: docker compose up --build"
