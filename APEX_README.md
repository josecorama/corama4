# APEX Accelerator Post-Award Contract Tracking System

## Quick Start Guide

This README provides instructions for integrating and using the APEX Post-Award Contract Tracking System with the existing CORAMA platform.

---

## Overview

The APEX Post-Award Contract Tracking System is a comprehensive solution for APEX Accelerator offices to:

- **Track government contract awards** automatically and through client self-reporting
- **Generate milestones** automatically for key contract deadlines
- **Send automated email alerts** to clients and counselors
- **Match public contract data** to existing clients using fuzzy matching
- **Provide dashboards** for both staff and clients to monitor contract performance

**Key Differentiator**: Unlike bid-matching tools that focus on opportunity discovery, this system is specifically designed for **post-award tracking and automation** - monitoring contracts after they've been won.

---

## Files Included

### Core Modules

1. **`apex_award_tracker.py`** - Main tracking engine
   - `ApexAwardTracker` class for managing clients, contracts, milestones, and alerts
   - `ApexMatchingEngine` class for fuzzy matching awards to clients

2. **`apex_api_integration.py`** - API integration layer
   - `SAMgovAPI` class for SAM.gov data
   - `USASpendingAPI` class for USASpending.gov data
   - `ApexAPIOrchestrator` class for coordinating multiple data sources

3. **`apex_email_notifications.py`** - Email notification system
   - `ApexEmailNotifier` class for sending milestone alerts and notifications

4. **`apex_prototype_import.py`** - Standalone prototype script
   - Demonstrates end-to-end data import and matching workflow
   - Can be run independently for testing

### Templates

5. **`templates/apex_dashboard.html`** - Main dashboard for clients/staff
6. **`templates/apex_submit_award.html`** - Contract award submission form

### Documentation

7. **`POST_AWARD_TRACKING_SYSTEM.md`** - Complete system architecture and design document
8. **`APEX_README.md`** - This file (integration guide)

---

## Installation

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

New dependencies added:
- `fuzzywuzzy==0.18.0` - Fuzzy string matching
- `python-Levenshtein==0.25.0` - String similarity calculations
- `APScheduler==3.10.4` - Background job scheduling
- `icalendar==5.0.11` - Calendar invite generation

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Optional: SAM.gov API Key (for enhanced data access)
SAM_GOV_API_KEY=your_sam_gov_api_key_here

# Email settings (already configured in CORAMA)
EMAIL_GOOGLE_USER=your_email@domain.com
EMAIL_GOOGLE_PASS=your_app_password

# Optional: APEX-specific settings
APEX_FROM_EMAIL=noreply@apex-accelerator.org
APEX_FROM_NAME=APEX Accelerator
```

**Note**: SAM.gov API key is optional. The system will work with USASpending.gov API (no key required) if SAM.gov key is not provided.

---

## Integration with CORAMA Flask App

### Step 1: Import APEX Modules in `app.py`

Add these imports at the top of `app.py`:

```python
from apex_award_tracker import ApexAwardTracker, ApexMatchingEngine
from apex_api_integration import ApexAPIOrchestrator
from apex_email_notifications import ApexEmailNotifier
```

### Step 2: Initialize APEX Components

Add after Firebase initialization in `app.py`:

```python
# Initialize APEX Award Tracker
apex_tracker = ApexAwardTracker(db, admin_db)
apex_matching_engine = ApexMatchingEngine(apex_tracker)
apex_api_orchestrator = ApexAPIOrchestrator(sam_api_key=os.getenv('SAM_GOV_API_KEY'))
apex_email_notifier = ApexEmailNotifier()
```

### Step 3: Add Flask Routes

Add these routes to `app.py`:

```python
@app.route('/apex/dashboard')
def apex_dashboard():
    """APEX dashboard showing contracts and milestones"""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    user_id = session['user']['localId']
    
    # Get user's client record
    clients = apex_tracker.get_all_clients()
    user_client = next((c for c in clients if c.get('contact_email') == session['user'].get('email')), None)
    
    if not user_client:
        flash('No APEX client record found. Please contact your counselor.', 'warning')
        return redirect(url_for('Welcome'))
    
    client_id = user_client['client_id']
    
    # Get contracts and milestones
    contracts = apex_tracker.get_client_contracts(client_id)
    milestones = apex_tracker.get_client_milestones(client_id, status='pending')
    
    # Calculate statistics
    stats = {
        'active_contracts': len([c for c in contracts if c.get('status') == 'active']),
        'total_value': sum(c.get('contract_value', 0) for c in contracts),
        'upcoming_milestones': len([m for m in milestones if m.get('due_date', '') >= datetime.utcnow().date().isoformat()]),
        'completed_milestones': 0,  # TODO: Calculate from completed milestones
        'expiring_contracts': len([c for c in contracts if c.get('end_date', '') <= (datetime.utcnow() + timedelta(days=90)).date().isoformat()])
    }
    
    return render_template('apex_dashboard.html',
                         contracts=contracts,
                         milestones=milestones[:10],  # Next 10 milestones
                         stats=stats,
                         is_staff=False,
                         pending_reviews=0)


@app.route('/apex/submit-award', methods=['GET', 'POST'])
def apex_submit_award():
    """Submit a new contract award"""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    if request.method == 'GET':
        return render_template('apex_submit_award.html')
    
    # POST: Process form submission
    try:
        user_id = session['user']['localId']
        
        # Get user's client record
        clients = apex_tracker.get_all_clients()
        user_client = next((c for c in clients if c.get('contact_email') == session['user'].get('email')), None)
        
        if not user_client:
            return jsonify({'success': False, 'message': 'No APEX client record found'}), 400
        
        # Build contract data from form
        contract_data = {
            'client_id': user_client['client_id'],
            'contract_number': request.form.get('contract_number'),
            'contract_title': request.form.get('contract_title'),
            'awarding_agency': request.form.get('awarding_agency'),
            'awarding_office': request.form.get('awarding_office', ''),
            'contract_type': request.form.get('contract_type'),
            'contract_value': float(request.form.get('contract_value', 0)),
            'award_date': request.form.get('award_date'),
            'start_date': request.form.get('start_date'),
            'end_date': request.form.get('end_date'),
            'option_years': int(request.form.get('option_years', 0)),
            'naics_code': request.form.get('naics_code', ''),
            'psc_code': request.form.get('psc_code', ''),
            'place_of_performance': request.form.get('place_of_performance', ''),
            'has_subcontracting_plan': request.form.get('has_subcontracting_plan') == 'true',
            'invoicing_frequency': request.form.get('invoicing_frequency', 'quarterly'),
            'reporting_requirements': request.form.get('reporting_requirements', ''),
            'sam_gov_url': request.form.get('sam_gov_url', ''),
            'notes': request.form.get('notes', ''),
            'data_source': 'client_reported'
        }
        
        # Create contract (automatically generates milestones)
        success, message, contract_id = apex_tracker.create_contract(contract_data, auto_generate_milestones=True)
        
        if success:
            # Send notification email
            apex_email_notifier.send_contract_created_notification(user_client, contract_data)
            
            return jsonify({
                'success': True,
                'message': 'Contract award submitted successfully',
                'contract_id': contract_id
            })
        else:
            return jsonify({'success': False, 'message': message}), 400
            
    except Exception as e:
        logger.error(f"Error submitting contract award: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/apex/contract/<contract_id>')
def apex_contract_details(contract_id):
    """View contract details and milestones"""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    contract = apex_tracker.get_contract(contract_id)
    if not contract:
        flash('Contract not found', 'error')
        return redirect(url_for('apex_dashboard'))
    
    # Get milestones for this contract
    milestones = apex_tracker.get_client_milestones(contract['client_id'])
    contract_milestones = [m for m in milestones if m.get('contract_id') == contract_id]
    
    return render_template('apex_contract_details.html',
                         contract=contract,
                         milestones=contract_milestones)


@app.route('/apex/milestones')
def apex_milestones():
    """View all milestones"""
    if 'user' not in session:
        return redirect(url_for('Login'))
    
    user_id = session['user']['localId']
    
    # Get user's client record
    clients = apex_tracker.get_all_clients()
    user_client = next((c for c in clients if c.get('contact_email') == session['user'].get('email')), None)
    
    if not user_client:
        flash('No APEX client record found', 'warning')
        return redirect(url_for('Welcome'))
    
    milestones = apex_tracker.get_client_milestones(user_client['client_id'])
    
    return render_template('apex_milestones.html', milestones=milestones)
```

### Step 4: Add Navigation Links

Update `templates/navbar.html` to include APEX links:

```html
{% if is_logged_in %}
<li class="nav-item">
    <a class="nav-link" href="{{ url_for('apex_dashboard') }}">
        <i class="fas fa-clipboard-check"></i> APEX Tracking
    </a>
</li>
{% endif %}
```

---

## Running the Prototype Script

The prototype script demonstrates the complete workflow without requiring Flask integration:

```bash
# Run with default settings (last 7 days, min $25,000)
python apex_prototype_import.py

# Run with custom parameters
python apex_prototype_import.py --days 30 --min-value 50000

# Create sample clients first
python apex_prototype_import.py --create-samples --days 7
```

**What the script does:**

1. Connects to Firebase
2. Optionally creates sample APEX clients
3. Fetches recent contract awards from USASpending.gov (and SAM.gov if API key is configured)
4. Matches awards to existing clients using fuzzy matching
5. Auto-creates contracts for high-confidence matches (≥95%)
6. Queues medium-confidence matches for staff review (70-94%)
7. Generates milestones and alerts for all contracts
8. Displays summary statistics

---

## Setting Up Automated Daily Sync

### Option 1: Using APScheduler (Recommended)

Add to `app.py`:

```python
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

def run_daily_sync():
    """Run daily contract award sync"""
    logger.info("Starting daily APEX contract sync...")
    
    try:
        # Fetch recent awards
        awards = apex_api_orchestrator.fetch_all_recent_awards(days_back=1, min_value=25000)
        
        # Match to clients
        for award in awards:
            matches = apex_matching_engine.match_award_to_client(award)
            
            if matches:
                # Create match queue entry (auto-approves if confidence ≥95%)
                apex_matching_engine.create_match_queue_entry(award, matches)
        
        logger.info(f"Daily sync completed: {len(awards)} awards processed")
        
    except Exception as e:
        logger.error(f"Error in daily sync: {str(e)}")

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=run_daily_sync, trigger="cron", hour=6, minute=0)  # Run at 6:00 AM daily
scheduler.start()
```

### Option 2: Using Cron Job

Create a cron job to run the prototype script daily:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 6:00 AM
0 6 * * * cd /path/to/corama3 && /path/to/python apex_prototype_import.py --days 1 >> /var/log/apex_sync.log 2>&1
```

---

## Sending Daily Alert Emails

Add this function to send pending alerts:

```python
def send_daily_alerts():
    """Send all pending alerts for today"""
    logger.info("Sending daily APEX alerts...")
    
    try:
        # Get pending alerts for today
        alerts = apex_tracker.get_pending_alerts()
        
        for alert in alerts:
            # Get related data
            client = apex_tracker.get_client(alert['client_id'])
            contract = apex_tracker.get_contract(alert['contract_id'])
            
            # Get milestone data from Firebase
            milestone = db.child('apex_milestones').child(alert['milestone_id']).get().val()
            
            if client and contract and milestone:
                # Send email
                success = apex_email_notifier.send_milestone_alert(alert, client, contract, milestone)
                
                if success:
                    # Mark alert as sent
                    apex_tracker.mark_alert_sent(alert['alert_id'])
        
        logger.info(f"Sent {len(alerts)} alerts")
        
    except Exception as e:
        logger.error(f"Error sending alerts: {str(e)}")

# Add to scheduler
scheduler.add_job(func=send_daily_alerts, trigger="cron", hour=8, minute=0)  # Run at 8:00 AM daily
```

---

## Database Structure

The system uses Firebase Realtime Database with these collections:

- **`apex_clients/`** - Client company information
- **`apex_contracts/`** - Contract award records
- **`apex_milestones/`** - Contract milestones and deadlines
- **`apex_alerts/`** - Scheduled alert notifications
- **`apex_match_queue/`** - Pending matches for staff review
- **`apex_performance_metrics/`** - Performance tracking data

See `POST_AWARD_TRACKING_SYSTEM.md` for complete database schema.

---

## API Usage Examples

### Create a Client

```python
client_data = {
    'company_name': 'ABC Manufacturing Inc.',
    'duns_number': '123456789',
    'uei_code': 'ABC123456789',
    'cage_code': '1A2B3',
    'contact_email': 'owner@abcmfg.com',
    'contact_name': 'John Smith',
    'assigned_counselor_email': 'counselor@apex.org',
    'industry_naics': ['336411'],
    'business_type': 'Small Business',
    'region': 'Midwest',
    'state': 'IL'
}

success, message, client_id = apex_tracker.create_client(client_data)
```

### Create a Contract

```python
contract_data = {
    'client_id': 'client_abc123',
    'contract_number': 'W912DY-24-C-0001',
    'contract_title': 'Manufacturing Services',
    'awarding_agency': 'Department of Defense',
    'contract_value': 500000.00,
    'start_date': '2024-03-01',
    'end_date': '2025-02-28',
    'invoicing_frequency': 'quarterly',
    'has_subcontracting_plan': True
}

success, message, contract_id = apex_tracker.create_contract(contract_data, auto_generate_milestones=True)
```

### Fetch Recent Awards

```python
# Fetch from all sources
awards = apex_api_orchestrator.fetch_all_recent_awards(days_back=7, min_value=25000)

# Match to clients
for award in awards:
    matches = apex_matching_engine.match_award_to_client(award)
    if matches:
        print(f"Found {len(matches)} potential matches for {award['recipient_name']}")
```

---

## Testing

### Manual Testing

1. **Create a test client:**
   ```bash
   python apex_prototype_import.py --create-samples
   ```

2. **Run the import script:**
   ```bash
   python apex_prototype_import.py --days 7
   ```

3. **Check Firebase Database:**
   - Verify clients were created in `apex_clients/`
   - Verify contracts in `apex_contracts/`
   - Verify milestones in `apex_milestones/`
   - Verify alerts in `apex_alerts/`

4. **Test email notifications:**
   - Ensure SMTP credentials are configured
   - Run `send_daily_alerts()` function
   - Check email delivery

### Automated Testing

Run the existing test suite:

```bash
python test_functions.py
```

---

## Troubleshooting

### Issue: No awards found

**Solution**: 
- Check that USASpending.gov API is accessible
- Try increasing `days_back` parameter
- Lower `min_value` threshold

### Issue: No matches found

**Solution**:
- Verify clients have correct UEI/DUNS/CAGE codes
- Check that client company names are accurate
- Review fuzzy matching threshold (currently 70%)

### Issue: Emails not sending

**Solution**:
- Verify SMTP credentials in `.env`
- Check `EMAIL_GOOGLE_USER` and `EMAIL_GOOGLE_PASS`
- Enable "Less secure app access" or use App Password for Gmail

### Issue: Firebase permission errors

**Solution**:
- Verify Firebase Admin SDK credentials
- Check `SERVICE_ACCOUNT_JSON` path
- Ensure database rules allow server-side access

---

## Next Steps

1. **Customize milestone types** - Edit `generate_milestones()` in `apex_award_tracker.py`
2. **Add custom reports** - Create new routes and templates for analytics
3. **Integrate with CRM** - Use examples in `POST_AWARD_TRACKING_SYSTEM.md`
4. **Add mobile app** - Use Firebase SDK for iOS/Android
5. **Implement role-based access** - Add staff vs. client permissions

---

## Support

For questions or issues:

1. Review `POST_AWARD_TRACKING_SYSTEM.md` for complete architecture
2. Check Firebase logs for errors
3. Review application logs in `/var/log/` or console output
4. Contact your APEX Accelerator administrator

---

## License

This system is part of the CORAMA platform and follows the same licensing terms.

---

**Version**: 1.0  
**Last Updated**: November 5, 2025  
**Author**: APEX Accelerator Development Team
