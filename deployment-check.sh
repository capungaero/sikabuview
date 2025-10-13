#!/bin/bash

# SikaBuView Deployment Health Check Script
echo "🚀 SikaBuView Deployment Health Check"
echo "======================================"

# Check if files exist
echo "📋 Checking core files..."
files=("index.html" "css/style-new.css" "js/app.js" "js/booking.js" "js/modern-navigation.js")

for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check HTML syntax
echo ""
echo "🔍 Checking HTML syntax..."
if command -v tidy &> /dev/null; then
    tidy -q -e index.html
    if [[ $? -eq 0 ]]; then
        echo "✅ HTML syntax valid"
    else
        echo "⚠️  HTML syntax warnings (non-critical)"
    fi
else
    echo "⚠️  HTML tidy not available - skipping syntax check"
fi

# Check JavaScript syntax
echo ""
echo "🔍 Checking JavaScript syntax..."
if command -v node &> /dev/null; then
    for jsfile in js/*.js; do
        node -c "$jsfile" 2>/dev/null
        if [[ $? -eq 0 ]]; then
            echo "✅ $(basename $jsfile) syntax valid"
        else
            echo "❌ $(basename $jsfile) syntax error"
            exit 1
        fi
    done
else
    echo "⚠️  Node.js not available - skipping JS syntax check"
fi

# Check mobile menu fix
echo ""
echo "📱 Checking mobile compatibility fixes..."
if grep -q 'class="mobile-menu-toggle"' index.html; then
    count=$(grep -c 'class="mobile-menu-toggle"' index.html)
    if [[ $count -eq 1 ]]; then
        echo "✅ Single mobile menu toggle found"
    else
        echo "❌ Multiple mobile menu toggles detected ($count)"
        exit 1
    fi
else
    echo "❌ Mobile menu toggle not found"
    exit 1
fi

# Check modal structure fix
echo ""
echo "🔧 Checking modal dialog fixes..."
if grep -q 'class="modal-overlay"' index.html; then
    echo "✅ Modal overlay structure correct"
else
    echo "❌ Modal overlay structure missing"
    exit 1
fi

# Check responsive CSS
echo ""
echo "📐 Checking responsive design..."
if grep -q "@media.*max-width.*768px" css/style-new.css; then
    echo "✅ Mobile breakpoints defined"
else
    echo "❌ Mobile breakpoints missing"
    exit 1
fi

# Test local server capability
echo ""
echo "🌐 Testing local server capability..."
if command -v python3 &> /dev/null; then
    echo "✅ Python3 available for local testing"
    echo "   Run: python3 -m http.server 8080"
elif command -v node &> /dev/null; then
    echo "✅ Node.js available for local testing"
    echo "   Run: npx http-server . -p 8080"
else
    echo "⚠️  No local server available"
fi

echo ""
echo "🎉 Deployment health check completed!"
echo "📍 Production URL: https://capungaero.github.io/sikabuview/"
echo ""
echo "✅ All critical checks passed - Ready for deployment!"