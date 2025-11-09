#!/usr/bin/env python3
"""
Generate checkout-users.csv file for stress testing.
Creates 1000 test users with credentials for JMeter CSV Data Set Config.
"""

import csv
import os

# Output file path
CSV_FILE = "performance-testing/scenarios/checkout-flow/test-data/checkout-users.csv"


def generate_checkout_users_csv():
    """Generate CSV file with 1000 test user credentials."""
    print(f"Generating {CSV_FILE}...")

    # Ensure directory exists
    os.makedirs(os.path.dirname(CSV_FILE), exist_ok=True)

    # Generate CSV with 1000 users
    with open(CSV_FILE, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)

        # Write header
        writer.writerow(['email', 'password'])

        # Write 1000 user rows
        for i in range(1, 1001):
            email = f"testuser{i}@example.com"
            password = "password123"
            writer.writerow([email, password])

    # Verify file was created
    with open(CSV_FILE, 'r') as f:
        line_count = sum(1 for line in f)

    print(f"✓ Generated {CSV_FILE}")
    print(f"  Total lines: {line_count} (1 header + {line_count - 1} users)")
    print(
        f"  Users: testuser1@example.com to testuser{line_count - 1}@example.com")
    print(f"  Password (all): password123")


if __name__ == "__main__":
    generate_checkout_users_csv()
