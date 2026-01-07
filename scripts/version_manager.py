#!/usr/bin/env python3
import sys
import argparse
import datetime
import os

VERSION_FILE = "VERSION"

def get_current_date_parts():
    now = datetime.datetime.now()
    return now.year, now.month, now.strftime("%Y%m%d.%H%M")

def read_version():
    if not os.path.exists(VERSION_FILE):
        return None
    with open(VERSION_FILE, 'r') as f:
        return f.read().strip()

def write_version(version):
    with open(VERSION_FILE, 'w') as f:
        f.write(version)
    print(f"Updated {VERSION_FILE} to {version}")

def calculate_next_version(release_type):
    current_version = read_version()
    year, month, timestamp = get_current_date_parts()
    
    # Format: YYYY.MM
    date_prefix = f"{year}.{month}"
    
    # Defaults
    patch = 0
    
    if current_version:
        # Check if current version matches this month
        parts = current_version.split('.')
        if len(parts) >= 2:
            v_year = int(parts[0])
            v_month = int(parts[1])
            
            if v_year == year and v_month == month:
                # Same month, increment patch
                # Handle potential suffixes like -beta, -nightly
                last_part = parts[2]
                if '-' in last_part:
                    patch_str = last_part.split('-')[0]
                else:
                    patch_str = last_part
                
                try:
                    patch = int(patch_str) + 1
                except ValueError:
                    patch = 0 # Fallback
            else:
                # Different month/year, reset patch
                patch = 1
        else:
            patch = 1
    else:
        patch = 1
        
    base_version = f"{date_prefix}.{patch}"

    if release_type == "stable":
        return base_version
    elif release_type == "beta":
        return f"{base_version}-beta"
    elif release_type == "nightly":
        # Nightly doesn't bump the base version patch usually, or it does?
        # Requirement: YYYY.MM.PATCH-nightly.TIMESTAMP
        # Let's assume nightly builds off the current NEXT patch
        return f"{base_version}-nightly.{timestamp}"
    elif release_type == "dev":
         # Just bump to dev for next cycle
        return f"{base_version}-dev"
        
    return base_version

def main():
    parser = argparse.ArgumentParser(description="Manage Project Versioning")
    parser.add_argument("--type", choices=["stable", "beta", "nightly", "dev"], required=True, help="Release type")
    parser.add_argument("--dry-run", action="store_true", help="Print version without updating file")
    
    args = parser.parse_args()
    
    next_version = calculate_next_version(args.type)
    
    if args.dry_run:
        print(next_version)
    else:
        write_version(next_version)
        # Output for GitHub Actions
        # Using environment file if running in GH Actions
        github_output = os.environ.get('GITHUB_OUTPUT')
        if github_output:
            with open(github_output, 'a') as f:
                f.write(f"VERSION={next_version}\n")
        print(f"Next Version: {next_version}")

if __name__ == "__main__":
    main()
