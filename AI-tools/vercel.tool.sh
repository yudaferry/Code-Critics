#!/usr/bin/env bash

# Vercel Tools Script for Code Critics
# Provides easy access to deployment logs and production URLs
# Only executable in nix-shell environment

if [ -z "$IN_NIX_SHELL" ]; then
    echo "Error: This script must be run inside nix-shell" >&2
    exit 1
fi

# Function to get latest deployment URL
get_latest_deployment() {
    yarn vercel list 2>/dev/null | grep -Eo 'https://[^ ]+' | head -n 1
}

case "$1" in
    "logs")
        echo "Fetching logs from latest deployment..."
        
        # Get latest deployment URL
        latest_url=$(get_latest_deployment)
        
        if [ -z "$latest_url" ]; then
            echo "Error: No deployment URL found." >&2
            echo "Make sure you have deployments in your Vercel project." >&2
            exit 1
        fi
        
        echo "Getting logs for: $latest_url"
        echo "----------------------------------------"
        
        # Use vercel inspect --logs to get deployment logs
        yarn vercel inspect "$latest_url" --logs
        ;;
        
    "url")
        echo "Fetching production URL from latest deployment..."
        
        # Get latest deployment URL
        latest_url=$(get_latest_deployment)
        
        if [ -z "$latest_url" ]; then
            echo "Error: No deployment URL found." >&2
            echo "Make sure you have deployments in your Vercel project." >&2
            exit 1
        fi
        
        echo "Inspecting deployment: $latest_url"
        
        # Get aliases from vercel inspect output
        # The aliases are prefixed with ╶ character
        aliases=$(yarn vercel inspect "$latest_url" 2>&1 | \
            grep -A 10 "Aliases" | \
            grep "╶" | \
            grep -Eo 'https://[^[:space:]]+')
        
        if [ -n "$aliases" ]; then
            echo ""
            echo "Available aliases:"
            echo "$aliases"
            echo ""
            
            # Try to find the main production URL (shortest, cleanest domain)
            # Prefer URLs without 'git-' in them (git branch deployments)
            production_url=$(echo "$aliases" | \
                grep -v 'git-' | \
                head -n 1)
            
            if [ -n "$production_url" ]; then
                echo "🌐 Main production URL: $production_url"
            else
                # If no non-git URL found, use the first alias
                production_url=$(echo "$aliases" | head -n 1)
                echo "🌐 Using first alias: $production_url"
            fi
        else
            echo ""
            echo "⚠️  No aliases found, using deployment URL: $latest_url"
        fi
        ;;
        
    "help"|"--help"|"-h")
        echo "Vercel Tools Script for Code Critics"
        echo ""
        echo "Usage: $0 {logs|url|help}"
        echo ""
        echo "Commands:"
        echo "  logs    Get build and runtime logs from the latest deployment"
        echo "  url     Get the production URL from latest deployment aliases"
        echo "  help    Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 logs    # View deployment logs"
        echo "  $0 url     # Get production URL"
        echo ""
        echo "Note: This script must be run inside nix-shell environment"
        ;;
        
    *)
        echo "Usage: $0 {logs|url|help}"
        echo ""
        echo "Commands:"
        echo "  logs    Get logs from the latest deployment"
        echo "  url     Get the production URL from latest deployment aliases"
        echo "  help    Show detailed help"
        echo ""
        echo "Run '$0 help' for more information."
        exit 1
        ;;
esac
