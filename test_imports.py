import sys
sys.path.append('.')

try:
    from ai_assistant_enhanced import EnhancedAIAssistant
    print('✅ EnhancedAIAssistant import successful')
except ImportError as e:
    print(f'❌ EnhancedAIAssistant import error: {e}')

try:
    from enhanced_features import ContractOpportunityScorer, CompetitiveIntelligence, ProposalOptimizer, DeadlineManager, IndustryTemplateLibrary
    print('✅ Enhanced features import successful')
except ImportError as e:
    print(f'❌ Enhanced features import error: {e}')

print('All import tests completed')
