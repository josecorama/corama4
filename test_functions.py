#!/usr/bin/env python3
"""Test script to verify all missing functions work correctly."""

import sys
import os
sys.path.append('.')

def test_imports():
    """Test that all modules can be imported without errors."""
    try:
        from app import app, budget_in_range, percentage_in_range, generate_capability_embeddings
        print('✅ All missing functions imported successfully!')
        print('✅ Flask app created successfully!')
        return True
    except ImportError as e:
        print(f'❌ Import error: {e}')
        return False

def test_budget_function():
    """Test budget_in_range function with various formats."""
    from app import budget_in_range
    
    test_cases = [
        ("$50,000", 40000, 60000, True),
        ("50K", 40000, 60000, True),
        ("1M", 500000, 1500000, True),
        ("100", 50, 150, True),
        ("invalid", 40000, 60000, False),
        ("", 40000, 60000, False),
        (None, 40000, 60000, False),
    ]
    
    print('✅ Testing budget_in_range:')
    all_passed = True
    for budget_str, min_val, max_val, expected in test_cases:
        result = budget_in_range(budget_str, min_val, max_val)
        status = "✅" if result == expected else "❌"
        print(f'  {status} {budget_str} in range {min_val}-{max_val}: {result} (expected {expected})')
        if result != expected:
            all_passed = False
    
    return all_passed

def test_percentage_function():
    """Test percentage_in_range function with various formats."""
    from app import percentage_in_range
    
    test_cases = [
        ("85%", 80, 90, True),
        ("85.5", 80, 90, True),
        ("85", 80, 90, True),
        ("95", 80, 90, False),
        ("invalid", 80, 90, False),
        ("", 80, 90, False),
        (None, 80, 90, False),
    ]
    
    print('✅ Testing percentage_in_range:')
    all_passed = True
    for percentage_str, min_val, max_val, expected in test_cases:
        result = percentage_in_range(percentage_str, min_val, max_val)
        status = "✅" if result == expected else "❌"
        print(f'  {status} {percentage_str} in range {min_val}-{max_val}: {result} (expected {expected})')
        if result != expected:
            all_passed = False
    
    return all_passed

def main():
    """Run all tests."""
    print("Testing Contract Radar Maximizer application functions...")
    
    tests = [
        test_imports,
        test_budget_function,
        test_percentage_function,
    ]
    
    all_passed = True
    for test in tests:
        if not test():
            all_passed = False
        print()
    
    if all_passed:
        print('🎉 All tests passed! Application is ready for deployment.')
        return 0
    else:
        print('❌ Some tests failed. Please check the issues above.')
        return 1

if __name__ == '__main__':
    sys.exit(main())
