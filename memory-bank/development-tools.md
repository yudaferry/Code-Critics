# Development Tools: Code Critics

## Overview
Documentation of custom development tools and utilities created for the Code Critics project to enhance development workflow and debugging capabilities.

## Vercel Deployment Tool

### Location
`AI-tools/vercel.tool.sh`

### Purpose
A bash script that provides easy access to Vercel deployment logs and production URLs for debugging and testing purposes. Specifically designed to help AI assistants make informed decisions about deployment status and testing.

### Features

#### 1. Environment Safety
- **Nix-shell Requirement**: Only executable within the nix-shell environment
- **Error Prevention**: Prevents execution outside the proper development environment
- **Consistent Tooling**: Ensures access to yarn and vercel CLI tools

#### 2. Log Retrieval (`logs` command)
```bash
./AI-tools/vercel.tool.sh logs
```

**Functionality**:
- Fetches build and runtime logs from the latest Vercel deployment
- Automatically identifies the most recent deployment URL
- Uses `vercel inspect --logs` for comprehensive log retrieval
- Provides clear error messages if no deployments are found

**Use Cases**:
- Debugging webhook processing issues
- Monitoring serverless function execution
- Analyzing deployment failures
- Tracking API request/response patterns

#### 3. URL Discovery (`url` command)
```bash
./AI-tools/vercel.tool.sh url
```

**Functionality**:
- Discovers the production URL from latest deployment aliases
- Intelligently selects the main production URL over git branch deployments
- Filters out temporary deployment URLs (those with 'git-' prefix)
- Falls back to deployment URL if no aliases are available

**URL Selection Logic**:
1. **Preferred**: Clean production aliases (without 'git-' prefix)
2. **Fallback**: First available alias
3. **Last Resort**: Direct deployment URL

**Use Cases**:
- Getting the correct URL for webhook configuration
- Testing deployed endpoints
- Sharing production URLs for external testing
- Automated testing script configuration

#### 4. Help System (`help` command)
```bash
./AI-tools/vercel.tool.sh help
```

**Features**:
- Comprehensive usage documentation
- Command examples
- Environment requirements
- Clear command descriptions

### Technical Implementation

#### Command Structure
```bash
# Basic usage
./AI-tools/vercel.tool.sh {logs|url|help}

# Available commands
logs    # Get build and runtime logs from latest deployment
url     # Get production URL from latest deployment aliases  
help    # Show detailed help and usage examples
```

#### Core Functions

**`get_latest_deployment()`**:
- Parses `vercel list` output to extract deployment URLs
- Uses grep with regex to find HTTPS URLs
- Returns the most recent deployment URL

**Log Retrieval Process**:
1. Get latest deployment URL
2. Validate deployment exists
3. Execute `vercel inspect --logs` command
4. Display formatted output with clear headers

**URL Discovery Process**:
1. Get latest deployment URL
2. Execute `vercel inspect` to get aliases
3. Parse aliases from output (lines with ╶ character)
4. Filter and prioritize URLs based on naming patterns
5. Return the most appropriate production URL

#### Error Handling
- **No Deployments**: Clear error message with guidance
- **Environment Check**: Prevents execution outside nix-shell
- **Command Validation**: Helpful usage messages for invalid commands
- **Graceful Fallbacks**: Multiple strategies for URL discovery

### Integration with AI Development Workflow

#### Decision Making Support
The tool enables AI assistants to:
- **Assess Deployment Status**: Check if latest deployment is working
- **Debug Issues**: Access real-time logs for troubleshooting
- **Validate Changes**: Confirm webhook endpoints are accessible
- **Test Functionality**: Get correct URLs for testing

#### Automated Testing Integration
```bash
# Example usage in testing workflows
PRODUCTION_URL=$(./AI-tools/vercel.tool.sh url | grep "🌐" | cut -d' ' -f4)
curl "$PRODUCTION_URL/health" # Test health endpoint
```

#### Debugging Workflow
```bash
# Check deployment status
./AI-tools/vercel.tool.sh url

# If issues found, check logs
./AI-tools/vercel.tool.sh logs

# Look for specific error patterns
./AI-tools/vercel.tool.sh logs | grep -i "error\|fail\|timeout"
```

### Best Practices

#### When to Use
- **After Deployment**: Verify deployment success and get URLs
- **During Debugging**: Access logs when webhook processing fails
- **Before Testing**: Get correct production URLs for external testing
- **During Development**: Monitor function execution and performance

#### Security Considerations
- **Environment Isolation**: Only works in controlled nix-shell environment
- **No Sensitive Data**: Tool doesn't expose secrets or tokens
- **Read-Only Operations**: Only retrieves information, doesn't modify deployments

#### Performance Notes
- **Caching**: No caching implemented - always fetches fresh data
- **Rate Limiting**: Respects Vercel CLI rate limits
- **Network Dependency**: Requires internet connection for Vercel API access

### Future Enhancements

#### Potential Improvements
1. **Caching**: Cache deployment URLs for faster repeated access
2. **Filtering**: Add options to filter logs by time range or severity
3. **JSON Output**: Structured output for programmatic consumption
4. **Multiple Deployments**: Support for accessing specific deployment versions
5. **Integration**: Direct integration with testing scripts and CI/CD

#### Extension Possibilities
- **Webhook Testing**: Built-in webhook endpoint testing
- **Performance Monitoring**: Response time and error rate tracking
- **Deployment Comparison**: Compare logs between deployments
- **Alert Integration**: Notification when errors are detected

## Usage Examples

### For AI Assistants
```bash
# Check if deployment is accessible
URL=$(./AI-tools/vercel.tool.sh url | grep "🌐" | cut -d' ' -f4)
curl -s "$URL/health" | jq .

# Debug webhook issues
./AI-tools/vercel.tool.sh logs | grep -A5 -B5 "webhook"

# Monitor recent errors
./AI-tools/vercel.tool.sh logs | grep -i "error" | tail -10
```

### For Development Testing
```bash
# Get production URL for webhook configuration
./AI-tools/vercel.tool.sh url

# Monitor real-time webhook processing
./AI-tools/vercel.tool.sh logs | grep "webhook\|review\|github"

# Check deployment health
PROD_URL=$(./AI-tools/vercel.tool.sh url | grep "🌐" | cut -d' ' -f4)
curl "$PROD_URL/health" | jq '.services.github.status'
```

### For Debugging Workflows
```bash
# Full debugging session
echo "=== Deployment Status ==="
./AI-tools/vercel.tool.sh url

echo "=== Recent Logs ==="
./AI-tools/vercel.tool.sh logs | tail -50

echo "=== Error Summary ==="
./AI-tools/vercel.tool.sh logs | grep -i "error\|fail" | tail -10
```

## Integration with Memory Bank

### Related Documentation
- **`techContext.md`**: Vercel deployment configuration and patterns
- **`research/serverless-deployment.md`**: Deployment optimization strategies
- **`progress.md`**: Testing and deployment phase tracking

### Knowledge Integration
This tool enhances the development workflow by providing:
- **Real-time Feedback**: Immediate access to deployment status and logs
- **Debugging Support**: Quick access to error information for troubleshooting
- **Testing Facilitation**: Correct URLs for webhook and API testing
- **AI Decision Support**: Data for informed development decisions

The tool is particularly valuable for the Code Critics project's serverless architecture, where traditional debugging methods are limited and deployment feedback is crucial for development progress.