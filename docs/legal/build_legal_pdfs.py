"""Regenerate the legal PDFs served from static/docs (Terms of Use, Privacy Notice).

Usage:
    pip install reportlab
    python docs/legal/build_legal_pdfs.py

Writes static/docs/TermsofUse.pdf, static/docs/PrivacyNotice.pdf and static/docs/policy.pdf
(policy.pdf is a copy of the Privacy Notice; the footer links point at it).
"""
from __future__ import annotations

import os
import shutil
import sys

from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "static", "docs")

COMPANY = "CORAMA (Contract Radar Maximizer)"
PRODUCT = "Contract Radar Maximizer"
OWNER = "Illinois Hispanic Chamber of Commerce"
OWNER_SHORT = "IHCC"
OWNER_SITE = "https://ihccbusiness.net"
OWNER_EMAIL = "info@ihccbusiness.net"
OWNER_PHONE = "312.425.9500"
CONTACT_EMAIL = "admin@corama.ai"
CONTACT_ADDRESS = "180 N Michigan Ave, Suite 500, Chicago, IL 60601"
EFFECTIVE_DATE = "09/23/2026"

FONT_DIR = "/usr/share/fonts/truetype/liberation"
pdfmetrics.registerFont(TTFont("Serif", os.path.join(FONT_DIR, "LiberationSerif-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Serif-Bold", os.path.join(FONT_DIR, "LiberationSerif-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Serif-Italic", os.path.join(FONT_DIR, "LiberationSerif-Italic.ttf")))
pdfmetrics.registerFont(TTFont("Serif-BoldItalic", os.path.join(FONT_DIR, "LiberationSerif-BoldItalic.ttf")))
pdfmetrics.registerFontFamily("Serif", normal="Serif", bold="Serif-Bold", italic="Serif-Italic", boldItalic="Serif-BoldItalic")

BODY = ParagraphStyle("body", fontName="Serif", fontSize=12, leading=15, alignment=TA_JUSTIFY, spaceAfter=8)
TITLE = ParagraphStyle("title", parent=BODY, fontName="Serif-Bold", fontSize=16, leading=20, alignment=TA_CENTER, spaceAfter=2)
SUBTITLE = ParagraphStyle("subtitle", parent=TITLE, fontSize=14, leading=18)
CENTER = ParagraphStyle("center", parent=BODY, alignment=TA_CENTER)
HEADING = ParagraphStyle("heading", parent=BODY, fontName="Serif-Bold", spaceBefore=6, spaceAfter=6, alignment=0)
CONTACT = ParagraphStyle("contact", parent=BODY, alignment=0, spaceAfter=0)


def p(text: str) -> Paragraph:
    return Paragraph(text, BODY)


def heading(numeral: str, text: str) -> Paragraph:
    return Paragraph(f"{numeral}.&nbsp;&nbsp;&nbsp;&nbsp;{text}", HEADING)


def bullets(items: list[str], bullet: str = "bullet") -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(i, BODY), leftIndent=18) for i in items],
        bulletType=bullet,
        start=None if bullet == "bullet" else 1,
        leftIndent=18,
        bulletFontName="Serif",
        bulletFontSize=12,
        spaceAfter=4,
    )


def numbered(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(i, BODY), leftIndent=18) for i in items],
        bulletType="1",
        bulletFormat="%s.",
        leftIndent=18,
        bulletFontName="Serif",
        bulletFontSize=12,
        spaceAfter=4,
    )


def contact_block() -> list:
    return [
        Paragraph(f"CORAMA \u2013 a program of the {OWNER} ({OWNER_SHORT})", CONTACT),
        Paragraph(CONTACT_ADDRESS, CONTACT),
        Paragraph(f"Email: {CONTACT_EMAIL}", CONTACT),
        Paragraph(f"IHCC: {OWNER_EMAIL} \u00b7 {OWNER_PHONE} \u00b7 {OWNER_SITE}", CONTACT),
    ]


def build(filename: str, title: str, story: list) -> str:
    path = os.path.join(OUT_DIR, filename)
    doc = SimpleDocTemplate(
        path,
        pagesize=letter,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
        title=f"{COMPANY} - {title}",
        author=COMPANY,
    )
    doc.build(story)
    return path


# --------------------------------------------------------------------------- Terms of Use

def terms_of_use() -> list:
    s = [
        Paragraph(COMPANY, TITLE),
        Paragraph("Website Terms of Use", SUBTITLE),
        Paragraph(f"Effective Date: {EFFECTIVE_DATE}", CENTER),
        Spacer(1, 6),
        p(f"CORAMA ({PRODUCT}) (\u201cCorama,\u201d \u201cwe,\u201d \u201cus,\u201d or \u201cour\u201d) is an "
          f"artificial intelligence tool owned and operated by the {OWNER} ({OWNER_SHORT}), a 501(c)(6) not-for-profit "
          "organization based in Chicago, Illinois. Corama is offered at no cost to help small and diverse businesses "
          "discover, evaluate, and pursue public contracting opportunities."),
        p("These are the Terms of Use (the \u201cTerms\u201d) for Corama. These Terms are a binding agreement between "
          f"you and {OWNER_SHORT}, and apply when you visit any websites owned and operated by Corama, including our "
          f"website at corama.ai (the \u201cWebsite\u201d), use our artificial intelligence software and the {PRODUCT} "
          "platform, communicate with us, or use any and all of our products and services (collectively, our "
          "\u201cServices\u201d). References to Corama in these Terms include IHCC and its officers, employees, and "
          "agents."),
        p("By using our Services, you acknowledge you have read our Privacy Notice, and agree to our Terms of Use."),

        heading("I", "Eligibility Requirements"),
        p("The Services are intended for businesses and business professionals. By accepting these Terms through your "
          "use of our Services, you certify that you are at least 18 years of age and, if you are using the Services on "
          "behalf of a company or other organization, that you have the authority to bind that organization to these "
          "Terms. The Services are not directed to children under 13, and we do not knowingly permit them to register."),

        heading("II", "Representations &amp; Warranties to Corama"),
        p("By using our Services, you represent, warrant, and agree:"),
        numbered([
            "You meet all age and eligibility requirements expressed in these Terms;",
            "You are solely responsible for the accuracy, legality, and appropriateness of your use of the Services, "
            "including all data, files, and communications entered into the Services, as well as the use of "
            "downloadable assets generated from the Services; and",
            "You will only use our Services for lawful purposes.",
        ]),

        heading("III", "Prohibited Uses"),
        p("You agree not to use our Services:"),
        numbered([
            "In any way that violates any applicable federal, state, local, or international law or regulation "
            "(including, without limitation, any laws regarding the export of data or software to and from the US or "
            "other countries);",
            "For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way by exposing them "
            "to inappropriate content, asking for personal information, or otherwise;",
            "To transmit, or procure the sending of, any advertising or promotional material without our prior written "
            "consent, including any \u201cjunk mail,\u201d \u201cchain letter,\u201d \u201cspam,\u201d or any other "
            "similar solicitation;",
            "To violate the intellectual property rights of others, including copyright, patent, or trademark rights;",
            "To impersonate or attempt to impersonate Corama, a Corama employee, another user, or any other person or "
            "entity (including, without limitation, by using email addresses associated with any of the foregoing); or",
            "To engage in any other conduct that restricts or inhibits anyone\u2019s use or enjoyment of the Services, or "
            "which, as determined by us, may harm Corama or users of the Services, or expose them to liability.",
        ]),
        p("Additionally, you agree not to:"),
        numbered([
            "Use the Services in any manner that could disable, overburden, damage, or impair the site or interfere with "
            "any other party\u2019s use of the Services, including their ability to engage in real time activities "
            "through the Services;",
            "Use any robot, spider, or other automatic device, process, or means to access the Services for any purpose, "
            "including monitoring or copying any of the material on the Services;",
            "Use any device, software, or routine that interferes with the proper working of the Services;",
            "Introduce any viruses, Trojan horses, worms, logic bombs, or other material that is malicious or "
            "technologically harmful;",
            "Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Services, or any "
            "server, computer, or database connected to the Services or attack the Services in any way; or",
            "Otherwise attempt to interfere with the proper working of the Services.",
        ]),

        heading("IV", "Registering for an Account"),
        p("In order to use or access certain Services or features of the Services, you may be asked to register for a "
          "user account (an \u201cAccount\u201d) and become a registered user of the Services (a \u201cRegistered "
          "User\u201d). By becoming a Registered User, you agree to:"),
        numbered([
            "Provide accurate, current, and complete information about the Registered User during the registration "
            "process;",
            "Maintain and promptly update such information to keep it accurate, current, and complete;",
            "Maintain the security of your password and login information, and that you will not disclose your password "
            "or login information to any third party;",
            "Accept full responsibility for all use of any Account you register, and for any actions that arise from or "
            "take place using your Account, whether or not you have authorized such actions or use; and",
            "Immediately notify Corama of any unauthorized use of your Account.",
        ]),

        heading("V", "Termination of Access"),
        p("Failure to abide by the above section constitutes a breach of these Terms, which may result in immediate "
          "termination of your Account or other access to the Services."),
        p("Corama maintains the right to suspend or disable your access to the Services and any Account you may have "
          "created, or terminate these Terms, at our sole discretion and without prior notice to you if you breach the "
          "Terms, or if Corama otherwise determines such action is warranted."),
        p("Corama reserves the right to revoke your access to and use of the Services at any time, with or without "
          "cause."),

        heading("VI", "Services and Availability"),
        p("We reserve the right to withdraw or amend our Services at our sole discretion without notice. We will not be "
          "liable if, for any reason all, or any part of the Services are unavailable, at any time or for any period. "
          "From time to time, we may restrict user access to some parts or the entirety of our Services."),
        p("You are responsible for both:"),
        numbered([
            "Making all arrangements necessary for you to have access to the Services; and",
            "Ensuring that all persons who access the Services through your internet connection are aware of these "
            "Terms of Use and comply with them.",
        ]),
        p("Corama reserves the right to investigate and take appropriate legal action against anyone who violates these "
          "Terms."),

        heading("VII", "Access to the Services"),
        p("<b>No Fees.</b> Corama currently provides the Services, including the creation of an Account and the use of "
          f"the {PRODUCT} platform, at no cost to you. Corama does not sell paid subscriptions, credits, tokens, or "
          "any other form of prepaid usage for the Services, and does not collect payment information from you in "
          "connection with the Services."),
        p("<b>Future Changes.</b> Corama reserves the right to introduce fees for all or part of the Services in the "
          "future. If we do so, we will post the applicable pricing and payment terms on our Website or platform with "
          "the effective date and provide you with reasonable prior notice. No fee will be charged to you without your "
          "express agreement to such terms."),
        p("<b>Third Party Promotions &amp; Offerings.</b> From time to time, we may also offer special promotional "
          "plans, content or memberships, including offerings of third party products or services in conjunction with or "
          "through our Services. We are not responsible for the products or services provided by such third parties."),
        p("<b>Modification to Service Content.</b> We reserve the right to modify the features and content we provide "
          "as part of our Services from time to time and for any reason."),

        heading("VIII", "Reliance on Information Posted"),
        p("The information presented on or through the Services is made available solely for general information "
          "purposes. We do not warrant the accuracy, completeness, or usefulness of this information. Any reliance you "
          "place on such information is strictly at your own risk. We disclaim all liability and responsibility arising "
          "from any reliance placed on such materials by you or any other visitor to the Services, or by anyone who may "
          "be informed of any of its contents."),
        p("Our Services may include content provided by third parties, including materials provided by other users, "
          "bloggers, and third-party licensors, syndicators, aggregators, and/or reporting Services. All statements "
          "and/or opinions expressed in these materials, and all articles and responses to questions and other content, "
          "other than the content provided by Corama, are solely the opinions and the responsibility of the person or "
          "entity providing those materials. These materials do not necessarily reflect the opinion of Corama. We are "
          "not responsible, or liable to you or any third party, for the content or accuracy of any materials provided "
          "by any third parties."),

        heading("IX", "CORAMA Directory and Interactions With Other Users"),
        p("The Services include the CORAMA Directory, an optional catalog of contractors, partners, and subcontractors. "
          "If you choose to publish a Directory profile, the business information you include (such as company name, "
          "contact name, business email, phone number, industry, and description) will be visible to other users and "
          "visitors of the Services, and other users may contact you or add you to a proposal team through the "
          "Services. You control your profile visibility from your Directory settings and may edit or unpublish your "
          "profile at any time."),
        p("You are solely responsible for your interactions with other users, including any teaming, subcontracting, "
          "or business arrangements you enter into. Corama does not verify the identity, qualifications, or "
          "certifications of Directory participants and is not a party to any agreement between users."),

        heading("X", "Updates"),
        p("Corama may from time to time in its sole discretion develop and provide updates to the Services, which may "
          "include upgrades, bug fixes, patches, other error corrections, and/or new features (collectively, including "
          "related documentation, \u201cUpdates\u201d). Updates may also modify or delete in their entirety certain "
          "features and functionality. You agree that Corama has no obligation to provide any Updates or to continue to "
          "provide or enable any particular features or functionality. All Updates will be deemed part of the Services "
          "and be subject to these Terms."),

        heading("XI", "Intellectual Property"),
        p("<b>Service Content, Software and Trademarks.</b> You acknowledge and agree that our Services may contain "
          "content or features (\u201cService Content\u201d) that are protected by copyright, patent, trademark, trade "
          "secret, or other proprietary rights and laws. Except as expressly authorized by Corama, you agree not to "
          "modify, copy, frame, scrape, rent, lease, loan, sell, distribute or create derivative works based on our "
          "Services or Service Content, in whole or in part, except that the foregoing does not apply to any of your own "
          "feedback that you legally upload to our Services."),
        p(f"The Corama and {PRODUCT} names and logos are trademarks and Service marks of Corama (collectively the "
          "\u201cCorama Trademarks\u201d). Other Corama, product, and Service names and logos used and displayed via "
          "our Website may be trademarks or Service marks of their respective owners, who may or may not endorse or be "
          "affiliated with or connected to Corama. Nothing in these Terms or in our Services should be construed as "
          "granting, by implication, estoppel, or otherwise, any license or right to use any of Corama Trademarks "
          "displayed through our Services, without our prior written permission in each instance. All goodwill generated "
          "from the use of Corama Trademarks will inure to our exclusive benefit."),
        p("<b>Feedback Transmitted Through Our Services.</b> You acknowledge and agree that any questions, comments, "
          "suggestions, ideas, feedback, and other information unrelated to information you provide "
          "(\u201cFeedback\u201d), provided by you to Corama is non-confidential, and Corama will be entitled to the "
          "unrestricted use and dissemination of this Feedback for any purpose, commercial or otherwise, without "
          "acknowledgment or compensation to you."),
        p("You acknowledge and agree that Corama may preserve content, and may also disclose Feedback or content if "
          "required to do so by law, or in the good faith belief that such preservation or disclosure is reasonably "
          "necessary to: (a) comply with legal process, applicable laws or government requests; (b) enforce these Terms; "
          "(c) respond to claims that any content violates the rights of third parties; or (d) protect the rights, "
          "property, or personal safety of Corama, its users and the public. You understand that the technical "
          "processing and transmission of our Services, including your content, may involve: (i) transmissions over "
          "various networks; and (ii) changes to conform and adapt to technical requirements of connecting networks or "
          "devices."),

        heading("XII", "AI Software Terms"),
        p("<b>Content Ownership.</b> You are responsible for all content and personal information you upload to the "
          "Corama artificial intelligence software, including capability statements, company information, and any other "
          "documents (\u201cInput\u201d) including ensuring that it does not violate any applicable laws or these Terms. "
          "You represent, warrant, and agree that you have all necessary rights and permissions to provide the Input to "
          "the Services."),
        p("<b>License to Corama.</b> You retain ownership of your Input. By entering Input into the Corama artificial "
          "intelligence software, you grant to Corama a worldwide, non-exclusive, royalty-free license to host, store, "
          "reproduce, analyze, prepare derivative works of, and display the Input, and to sublicense the Input to the "
          "service providers that process it on our behalf (such as cloud hosting and artificial intelligence model "
          "providers), solely as necessary to provide, maintain, secure, and improve the Services and as otherwise "
          "described in our Privacy Notice. Input you choose to publish in the CORAMA Directory is additionally licensed "
          "for display to other users and visitors for as long as your profile remains published."),
        p("<b>License to Corama Output.</b> Subject to these Terms, upon creation of your Account we grant you a "
          "non-exclusive, non-transferrable, revocable, limited license to access and use the Services for so long as "
          "your Account remains active, including the product created from the Corama artificial intelligence software "
          "(\u201cOutput\u201d), such as contract matches, capability statements, and proposal drafts. You acknowledge "
          "and agree that the Services and Output are provided under license, and not sold, to you. You do not acquire "
          "any ownership interest in the Services under these Terms, or any other rights thereto other than to use the "
          "Services in accordance with the license granted, and subject to all terms, conditions, and restrictions, "
          "under these Terms."),
        p("<b>Similarity of Content.</b> Due to the nature of our Services and artificial intelligence generally, Output "
          "may not be unique and other users may receive similar output from our Services."),
        p("<b>Corama Use of Content.</b> We may use Input and Output (collectively, \u201cContent\u201d) to provide, "
          "maintain, develop, and improve our Services, comply with applicable law, enforce our terms and policies, and "
          "keep our Services safe. Corama does not use your Content to train its own artificial intelligence models. "
          "Content is processed by third-party artificial intelligence model providers through their business "
          "application programming interfaces (APIs), subject to those providers\u2019 terms."),
        p("<b>Responsible Use.</b> When you use our Services you represent, warrant, and agree that you will not rely on "
          "Output as a sole source of factual information. You must evaluate Output for accuracy and appropriateness for "
          "your use case, including verifying all contract details, deadlines, pricing, and compliance requirements "
          "against the official solicitation documents before submitting any bid or proposal."),

        heading("XIII", "Linking to the Services"),
        p("You may link to our Website, provided you do so in a way that is fair and legal and does not damage our "
          "reputation or take advantage of it, but you must not establish a link in such a way as to suggest any form of "
          "association, approval, or endorsement on our part without our express consent."),

        heading("XIV", "Third-Party Services"),
        p("Our Services may provide links or other access to other third party sites and resources on the internet, "
          "including government procurement portals such as SAM.gov. Corama has no control over such sites and "
          "resources and Corama is not responsible for and does not endorse such sites and resources. Links to "
          f"IHCC\u2019s main website ({OWNER_SITE}) are subject to the terms and privacy notice published there. Opportunity data displayed in the Services is obtained from public "
          "government sources and may be incomplete or out of date; the official solicitation always controls."),
        p("Our sign-up, log-in, and password-reset pages are protected by Google reCAPTCHA, which is subject to the "
          "Google Privacy Policy (https://policies.google.com/privacy) and Terms of Service "
          "(https://policies.google.com/terms)."),

        heading("XV", "Communications"),
        p("As part of your use of our Services, you consent to receive electronic communications from Corama, including "
          "email verification codes, password reset messages, notices about your Account, and notifications when "
          "another user contacts you or adds you to a proposal team through the Services. These are service-related "
          "messages necessary to operate the Services. If we send you promotional or marketing email, each such message "
          "will include a way to opt out, and we will honor your request as required by the CAN-SPAM Act. You may "
          "continue to receive service-related messages after opting out of promotional email."),

        heading("XVI", "Copyright Complaints"),
        p("Corama respects the intellectual property rights of others. If you believe that content available through the "
          "Services infringes your copyright, please send a notice that complies with the Digital Millennium Copyright "
          f"Act (17 U.S.C. \u00a7 512) to {CONTACT_EMAIL} or to the postal address in the Contact Us section, "
          "including: identification of the copyrighted work; identification of the allegedly infringing material and "
          "its location on the Services; your contact information; a statement that you have a good-faith belief the "
          "use is not authorized; a statement, under penalty of perjury, that the information in the notice is accurate "
          "and that you are the owner or authorized to act on the owner\u2019s behalf; and your physical or electronic "
          "signature. We may remove or disable access to the material and terminate the Accounts of repeat "
          "infringers."),

        heading("XVII", "Indemnity and Release"),
        p("You agree to release, indemnify, and hold harmless Corama, its affiliates, and its and their respective "
          "officers, employees, directors, members, and agents from any and all losses, damages, expenses, including "
          "reasonable attorneys\u2019 fees, rights, claims, actions of any kind and injury (including death) arising out "
          "of, or relating to, your use of Services and interactions with us, your violation of these Terms, or your "
          "violation of any rights of another."),

        heading("XVIII", "Disclaimer of Warranties Related to our Services"),
        p("YOUR USE OF OUR SERVICES AND YOUR INTERACTIONS WITH US IS AT YOUR SOLE RISK. OUR SERVICES ARE PROVIDED ON AN "
          "\u201cAS IS\u201d AND \u201cAS AVAILABLE\u201d BASIS. CORAMA EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, "
          "WHETHER EXPRESSED, IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF "
          "MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT."),
        p("CORAMA MAKES NO WARRANTY THAT: (I) OUR SERVICES OR OTHER INTERACTIONS WILL MEET YOUR REQUIREMENTS, (II) OUR "
          "SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURELY, OR ERROR-FREE, (III) THE RESULTS THAT MAY BE OBTAINED FROM "
          "THE USE OF OUR SERVICES WILL BE ACCURATE OR RELIABLE, OR (IV) THE QUALITY OF ANY PRODUCTS, SERVICES, "
          "INFORMATION, OR OTHER MATERIAL OBTAINED BY YOU THROUGH OUR SERVICES WILL MEET YOUR EXPECTATIONS."),

        heading("XIX", "Limitation of Liability"),
        p("YOU EXPRESSLY UNDERSTAND AND AGREE THAT CORAMA WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, "
          "CONSEQUENTIAL, EXEMPLARY DAMAGES, OR DAMAGES FOR LOSS OF PROFITS INCLUDING, BUT NOT LIMITED TO, DAMAGES FOR "
          "LOSS OF GOODWILL, USE, DATA OR OTHER INTANGIBLE LOSSES (EVEN IF CORAMA HAS BEEN ADVISED OF THE POSSIBILITY OF "
          "SUCH DAMAGES), WHETHER BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY OR OTHERWISE, RESULTING FROM: "
          "(I) THE USE, OR THE INABILITY TO USE, OUR SERVICES OR ANY CONTENT; (II) THE COST OF PROCUREMENT OF SUBSTITUTE "
          "GOODS AND SERVICES RESULTING FROM ANY GOODS, DATA, INFORMATION OR SERVICES OBTAINED OR MESSAGES RECEIVED OR "
          "TRANSACTIONS ENTERED INTO THROUGH OR FROM OUR SERVICES; (III) UNAUTHORIZED ACCESS TO OR ALTERATION OF YOUR "
          "CONTENT, TRANSMISSIONS, OR DATA; (IV) STATEMENTS OR CONDUCT OF ANY THIRD PARTY ON OUR SERVICES; (V) ANY BID, "
          "PROPOSAL, OR CONTRACT AWARD DECISION MADE BY ANY GOVERNMENT AGENCY OR OTHER THIRD PARTY; OR (VI) ANY OTHER "
          "MATTER RELATING TO OUR SERVICES OR CONTENT. IN NO EVENT WILL CORAMA\u2019S TOTAL LIABILITY TO YOU FOR ALL "
          "DAMAGES, LOSSES OR CAUSES OF ACTION EXCEED ONE HUNDRED U.S. DOLLARS (US $100). SOME JURISDICTIONS DO NOT "
          "ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR THE LIMITATION OR EXCLUSION OF LIABILITY FOR INCIDENTAL OR "
          "CONSEQUENTIAL DAMAGES. ACCORDINGLY, SOME OF THE ABOVE LIMITATIONS SET FORTH ABOVE MAY NOT APPLY TO YOU. IF "
          "YOU ARE DISSATISFIED WITH ANY PORTION OF OUR SERVICES OR WITH THESE TERMS, YOUR SOLE AND EXCLUSIVE REMEDY IS "
          "TO DISCONTINUE USE OF OUR SERVICES."),

        heading("XX", "General"),
        p("<b>Modification.</b> We may modify these Terms at any time. We will post the changes on our Website or "
          "platform with the effective date, and notify you of any material changes. Your continued use of our Services "
          "or continued interactions with us after the date of any such changes become effective constitutes your "
          "acceptance of these Terms."),
        p("<b>Governing Law and Venue.</b> These Terms will be governed by the laws of the State of Illinois and the "
          "federal laws of the United States, without regard to conflict of law provisions. You and Corama agree to "
          "submit to the personal and exclusive jurisdiction of the state courts located in Cook County, Illinois and "
          "the United States District Court for the Northern District of Illinois for any dispute arising out of these "
          "Terms or the Services. Corama may assign or transfer these Terms, in whole or in part, without restriction."),
        p("<b>Entire Agreement.</b> These Terms and our Privacy Notice constitute the entire agreement between you and "
          "Corama regarding the Services and supersede any prior agreements or drafts."),
        p("<b>No Waiver.</b> The failure of Corama to exercise or enforce any right or provision of these Terms will "
          "not constitute a waiver of such right or provision."),
        p("<b>Severability.</b> In case any provision of these Terms is found by a court of competent jurisdiction to be "
          "invalid, the validity, legality, and enforceability of the remaining provisions will not be affected and "
          "remain in full effect. The parties agree that the court should endeavor to give effect to the parties\u2019 "
          "intentions as reflected in the provision."),
        p("<b>Claim Limitations.</b> You agree that regardless of any statute or law to the contrary, any claim or cause "
          "of action arising out of the use of the Website or these Terms must be filed within one (1) year after such "
          "claim or cause of action arose or be forever barred."),

        heading("XXI", "Contact Us"),
        p("If you have any questions about these Terms, contact us at:"),
    ] + contact_block()
    return s


# --------------------------------------------------------------------------- Privacy Notice

def privacy_notice() -> list:
    s = [
        Paragraph(COMPANY, TITLE),
        Paragraph("Privacy Notice", SUBTITLE),
        Paragraph(f"Effective Date: {EFFECTIVE_DATE}", CENTER),
        Spacer(1, 6),
        p(f"CORAMA ({PRODUCT}) (\u201cCorama,\u201d \u201cwe,\u201d \u201cus,\u201d or \u201cour\u201d) is an "
          f"artificial intelligence tool owned and operated by the {OWNER} ({OWNER_SHORT}), a 501(c)(6) not-for-profit "
          "organization based in Chicago, Illinois. Corama is offered at no cost to the public to help small and "
          "diverse businesses discover, evaluate, and pursue public contracting opportunities."),
        p("IHCC understands the importance of your privacy and is committed to protecting the Personal Data of the "
          "business owners and professionals who use Corama. This Privacy Notice applies when you visit any websites "
          "owned and operated by Corama, including our website at corama.ai (the \u201cWebsite\u201d), use our "
          f"artificial intelligence software and the {PRODUCT} platform, communicate with us, or use any and all of our "
          "products and services (collectively, our \u201cServices\u201d). It applies solely to information collected "
          f"through Corama; information collected through IHCC\u2019s main website ({OWNER_SITE}) and IHCC\u2019s "
          "membership, events, and other programs is governed by the privacy notice published on that website."),
        p("This Privacy Notice describes what information we collect, how we use it and with whom it may be shared, "
          "the choices available to you regarding your information, and the security procedures we use to protect it. "
          "IHCC does not sell or rent your Personal Data to anyone."),
        p("By using our Services, you acknowledge you have read our Privacy Notice, and agree to our Terms of Use."),

        heading("I", "Information Collection"),
        p("When operating our Services, Corama collects information, including Personal Data about you. The types of "
          "information we collect depends on your level of engagement and how you interact with the Services. "
          "\u201cPersonal Data\u201d means information that can reasonably be linked to a particular individual."),
        p("<b>Sources of Information Collection.</b> We collect information from a variety of sources, including "
          "directly from you and your interactions with our Services. We may also obtain information about you from "
          "other sources, including through third-party services and publicly available government procurement "
          "databases such as SAM.gov."),
        p("The information we collect includes:"),
        p("<b>Identifiers and other Personal Information.</b> We collect identifiers when you interact with our "
          "Services or otherwise voluntarily provide them to us. This includes:"),
        bullets(["First and last name", "Email address", "Username and password (passwords are stored only in hashed "
                 "form by our authentication provider)", "Company name, job title, business address, and business "
                 "phone number", "Business identifiers such as UEI, CAGE code, and NAICS codes", "Certifications, team "
                 "size, and other business profile details you choose to provide"]),
        p("<b>Information About Others.</b> If you add team members or partners to a proposal, or contact another "
          "user through the CORAMA Directory, we collect the names, roles, email addresses, and phone numbers you "
          "enter about those individuals. You must have their permission to share that information with us."),
        p("<b>Communications Information.</b> We collect information within messages we exchange when you communicate "
          "with us. This includes:"),
        bullets(["Information in support requests", "Questions and feedback", "Survey responses",
                 "Other information you provide"]),
        p("<b>Technical and Usage Information.</b> Like most websites, our servers automatically record certain "
          "technical information when you use our Services, and our authentication and security providers record "
          "similar information when you sign up, log in, or reset your password. This information includes:"),
        bullets(["IP address", "Browser type and version", "Device and operating system information",
                 "Date, time, and pages or features you access", "Log-in and password-reset events",
                 "Actions you take in the Services, such as searches you run and documents you generate"]),
        p("We do not use web beacons, advertising cookies, or third-party analytics or advertising networks, and we do "
          "not track your activity on other websites. See Section IV (Use of Cookies) for details on the cookies we "
          "use."),
        p("<b>Documents and Business Information You Upload.</b> When you use our artificial intelligence software, we "
          "collect the documents and information you upload or enter, such as capability statements, company "
          "descriptions, past performance information, solicitation documents, and proposal drafts, together with the "
          "prompts and messages you send to our AI assistant."),
        p("<b>Other Information You Submit.</b> We collect any other information you submit to us through our Services "
          "through using our artificial intelligence software, by contacting us, or through other means."),
        p("<b>Payment Information.</b> Corama currently provides the Services at no cost and does not collect debit or "
          "credit card information, billing addresses, or other financial information from you."),

        heading("II", "Use of Information"),
        p("Corama uses information and Personal Data for a variety of purposes, as described below. We use the "
          "information we obtain about you to:"),
        bullets([
            "<b>Manage Our Organization and Provide Our Services.</b> Corama uses information and Personal Data to "
            "maintain user accounts, provide Services, facilitate usage of the Services, and complete necessary tasks to "
            "manage our business and provide our Services.",
            "<b>Match You With Opportunities.</b> Corama uses information and Personal Data, including the documents "
            "you upload, to identify and rank government contracting opportunities and to generate capability statements "
            "and proposal drafts for you.",
            "<b>Conduct Research and Improve Our Services.</b> Corama uses information and Personal Data to conduct "
            "research, such as questionnaires and surveys, and to analyze and enhance our marketing communication "
            "strategies and our Services as a whole.",
            "<b>Communicate.</b> Corama uses information and Personal Data to communicate important information, "
            "including delivering notices to you about the use of our Services.",
            "<b>Protect Our Organization.</b> Corama uses information and Personal Data to protect against fraud, "
            "unauthorized access, and other liabilities, and to secure our Services by identifying potential hackers "
            "and unauthorized users.",
            "<b>Ensure Security and Efficiency and to Comply with the Law.</b> We may use information and Personal "
            "Data for other purposes with your consent or where permitted by law, for example to comply with applicable "
            "legal requirements, court orders, legal proceedings, document requests, industry standards, and our "
            "internal policies.",
        ]),

        heading("III", "Disclosure of Personal Data"),
        p("We may disclose your information in the following circumstances to the below referenced parties. We disclose "
          "information and Personal Data:"),
        bullets([
            "<b>When You Consent.</b> Corama will not disclose your information and Personal Data to others without "
            "your consent, except as specified in this Privacy Notice.",
            "<b>To Our Service Providers and Vendors.</b> We transfer all or a portion of your information and Personal "
            "Data to service providers who process it on our behalf to deliver the Services. These currently include: "
            "Render (cloud hosting, located in the United States); Google Firebase (user authentication, database, and "
            "file storage); Google reCAPTCHA (bot and abuse protection on our sign-up, log-in, and password-reset "
            "pages); OpenAI (processing of your documents and prompts through its business API to generate contract "
            "matches, capability statements, and proposal drafts; under OpenAI\u2019s API terms, this data is not used "
            "to train OpenAI\u2019s models); Qdrant (search index used to match your profile with opportunities); and "
            "our email delivery provider (verification codes, password resets, and notifications). These service "
            "providers are required by contract or law to only use or disclose the information as necessary to perform "
            "services on our behalf or as otherwise required by law.",
            f"<b>Within {OWNER_SHORT}.</b> Because Corama is a program of {OWNER_SHORT}, your information may be "
            "accessed by IHCC staff who administer Corama and support its users. Only staff who need the information to "
            "perform a specific job are granted access. IHCC may contact you about Corama and about IHCC resources, "
            "programs, and events relevant to public contracting; you may unsubscribe from those messages at any time.",
            "<b>To Other Users.</b> If you choose to publish a profile in the CORAMA Directory, the business "
            "information you include in that profile will be visible to other users and visitors of the Services, who "
            "may contact you through the Services. If another user adds you to a proposal team or sends you an inquiry, "
            "we will share the message and that user\u2019s name and contact details with you, and yours with them.",
            "<b>Public Government Data.</b> Opportunity and awardee information shown in the Services is obtained from "
            "public government sources such as SAM.gov. We do not send your Personal Data to those agencies.",
            "<b>In the Event of a Merger, Acquisition, Change in Ownership, or Reorganization.</b> Information and "
            "Personal Data we have collected may be disclosed to a third party in the event of a merger, transfer of "
            "ownership or assets, bankruptcy, or other corporate reorganization.",
            "<b>No Sale or Sharing for Advertising.</b> Corama does not sell your Personal Data and does not share it "
            "with third parties for cross-context behavioral or targeted advertising, and has not done so in the "
            "preceding 12 months.",
            "<b>When Legally Permitted or Required to Do So.</b> Corama may disclose without your prior consent any "
            "information or Personal Data about you or your use of our Services, if we believe disclosure is necessary "
            "or required by law, or for our legitimate interests. Corama may disclose without your prior consent any "
            "information about you or your use of our Website, if we believe disclosure is necessary, including to:",
        ]),
        ListFlowable(
            [ListItem(Paragraph(i, BODY), leftIndent=36) for i in [
                "Protect and defend the rights, property, or safety of Corama, employees, other users of the Website, "
                "or the public;",
                "Enforce the Terms of Use and Privacy Notice;",
                "Respond to a legally valid request from a competent governmental authority;",
                "Respond to claims that any content violates the rights of third parties;",
                "Correspond with law enforcement agencies, if we are required to do so; and",
                "Satisfy any applicable law, regulation, legal process, or governmental request.",
            ]],
            bulletType="bullet", start="o", leftIndent=36, bulletFontName="Serif", bulletFontSize=12, spaceAfter=4,
        ),

        heading("IV", "Use of Cookies"),
        p("A cookie is a small text file that a website stores in your browser. Corama uses only the following "
          "cookies and similar technologies:"),
        bullets([
            "<b>Session cookie (strictly necessary).</b> When you log in, we set a cryptographically signed, HTTP-only session "
            "cookie that keeps you signed in and protects your Account. It is deleted when you log out or when you "
            "close your browser, and it is not used for advertising or tracking.",
            "<b>Google reCAPTCHA (security).</b> Our sign-up, log-in, and password-reset pages load Google reCAPTCHA to "
            "distinguish people from automated bots. Google may set cookies and collect hardware and software "
            "information (such as device and application data) for this purpose, subject to the Google Privacy Policy "
            "(https://policies.google.com/privacy).",
            "<b>Browser storage.</b> Our application stores your interface preferences (such as language and sidebar "
            "layout) in your browser\u2019s local storage. This data stays on your device and is not sent to us.",
        ]),
        p("We do not use advertising cookies, third-party analytics cookies, or web beacons. You can delete or block "
          "cookies through your web browser settings; however, because our session cookie is required to keep you "
          "signed in, blocking cookies will prevent you from using the logged-in features of the Services."),

        heading("V", "U.S. State Privacy Rights"),
        p("Certain U.S. states, including California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Montana, "
          "Oregon, Tennessee, Texas, Utah, and Virginia (now or in the future) give their residents rights to how their "
          "information is collected and used. Although some of these options apply generally, certain options will only "
          "apply to limited individuals or circumstances. Depending on your state of residence, you may exercise the "
          "following rights and choices:"),
        bullets([
            "<b>Right to Know and Access.</b> You may have the right to know whether Corama processes your Personal "
            "Data, or request access to the Personal Data we have collected about you.",
            "<b>Right to Correction.</b> You may request correction of Personal Data that we hold about you. This right "
            "allows you to request that Corama correct incomplete or inaccurate data Corama holds about you.",
            "<b>Right to Deletion.</b> You may have the right to request deletion of the Personal Data that we hold "
            "about you. Note, however, that we may not always be able to comply with your request of deletion for "
            "specific legal reasons which we will tell you about, if applicable, at the time of your request.",
            "<b>Right to Opt Out.</b> You have the right to opt out of the processing of your Personal Data for the "
            "purposes of targeted advertising, sales, or profiling in furtherance of decisions that produce legal or "
            "similarly significant effects. Corama does not sell Personal Data, does not use it for targeted "
            "advertising, and does not engage in such profiling, so there is currently nothing to opt out of.",
            "<b>Right to Non-Discrimination.</b> We will not deny you Services, charge you different prices, or "
            "provide a different level of quality because you exercised any of these rights.",
            "<b>Right to Portability.</b> You have the right to ask Corama to provide you with your Personal Data in a "
            "machine-readable format.",
            "<b>Right to Limit the Use of or Consent to the Processing of Sensitive Data.</b> We will ask your consent "
            "before we process your sensitive Personal Data or allow you to limit our use of sensitive data as required "
            "by law.",
        ]),
        p("The exact scope of these rights may vary. To exercise any of these rights please contact us at the "
          "information provided below. We will verify your request using the email address associated with your "
          "Account and respond within 45 days, or as otherwise required by applicable law. You may designate an "
          "authorized agent to make a request on your behalf; we may ask the agent for proof of authorization and may "
          "verify the request with you directly."),
        p("To appeal a decision regarding a consumer rights request, reply to our communication denying your request "
          "or email us at the address below with the subject line \u201cPrivacy Appeal.\u201d"),
        p("<b>California Residents.</b> The categories of Personal Data we have collected in the preceding 12 months, "
          "the sources, our business purposes, and the categories of recipients are described in Sections I through III "
          "above. We do not collect sensitive personal information as defined by the California Consumer Privacy Act "
          "beyond your Account log-in credentials, and we do not sell or share Personal Data. California Civil Code "
          "Section 1798.83 permits California residents to request information about disclosures of Personal Data to "
          "third parties for their direct marketing purposes; Corama does not make such disclosures."),

        heading("VI", "Exercising Your Privacy Options"),
        p(f"To exercise any of the above options, you may contact us at: {CONTACT_EMAIL}."),
        p("Please include your email address, full name, and specific information about your request(s). If you would "
          "like to update or correct your email address, work address, or other Personal Data with us, please include "
          "specific details about the information you wish to have updated or corrected."),
        p("<b>Account Information and Deletion.</b> You may review and update your name, company information, "
          "password, and Directory profile at any time from the Settings and Directory pages of the platform. To "
          f"delete your Account and the documents you have uploaded, email us at {CONTACT_EMAIL} from the email "
          "address associated with your Account."),
        p("<b>Email Communications.</b> The emails Corama sends today are service-related messages (verification "
          "codes, password resets, Account notices, and notifications from other users) that are necessary to operate "
          "the Services. If IHCC sends you email about resources, events, or programs, each message will include an "
          "unsubscribe link and we will honor your request as required by the CAN-SPAM Act. Service-related messages "
          "cannot be opted out of while you maintain an Account."),
        p("<b>Do Not Track Signals.</b> CalOPPA requires us to let you know how we respond to web browser Do Not Track "
          "(\u201cDNT\u201d) signals. Because there currently isn\u2019t an industry or legal standard recognizing or "
          "honoring DNT signals, we don\u2019t respond to them at this time. However, we do not track your activity "
          "across other websites, and we do not allow third parties to do so through our Services."),

        heading("VII", "Third Party Websites"),
        p("This Privacy Notice applies only to our Services. Our Services may contain links to other websites, "
          "including government procurement portals such as SAM.gov. We have no control over the privacy practices or "
          "the content of any of our business partners, advertisers, sponsors, or other third parties we link to from "
          "our Services. Corama does not endorse, approve, or certify these other websites, and we do not guarantee the "
          "accuracy, completeness, efficacy, or timeliness of the information contained on those websites. You should "
          "check the applicable privacy notice of the website sponsor when linking to other websites."),

        heading("VIII", "Information Retention"),
        p("We retain your Account information, uploaded documents, and generated Output for as long as your Account is "
          "active so that you can continue to use them in the Services. When you ask us to delete your Account, we "
          "delete or de-identify your Personal Data within a reasonable period, except where we need to retain it to "
          "comply with legal obligations, resolve disputes, enforce our agreements, or protect the security of the "
          "Services. Server logs containing technical information are retained for a limited period for security and "
          "troubleshooting. Please understand that residual copies of the Personal Data can remain in backups for a "
          "limited time in locations or formats that make immediate erasure difficult."),

        heading("IX", "Security"),
        p("Corama takes reasonable steps to secure your Personal Data. All traffic to the Services is encrypted in "
          "transit using HTTPS, passwords are handled by our authentication provider and never stored in plain text, "
          "session cookies are protected against script access, and account sign-up requires email verification. "
          "However, no internet transmission is ever fully secure, and we cannot guarantee that information transmitted "
          "via our Website will remain confidential at all times."),
        p("Our Services are hosted in the United States. If you access the Services from outside the United States, "
          "your information will be transferred to and processed in the United States."),

        heading("X", "Age Restrictions"),
        p("The Services are intended for businesses and business professionals and are not directed to children. By "
          "accepting the Privacy Notice through your use of our Services, you certify that you are at least 18 years "
          "of age. We do not knowingly collect Personal Data from children under 13 in accordance with the "
          "Children\u2019s Online Privacy Protection Act (COPPA). If we learn that a child under 13 has submitted "
          "Personal Data to us, we will delete it promptly. If you believe a child has provided us with Personal Data, "
          f"please contact us at {CONTACT_EMAIL}."),

        heading("XI", "Changes to Privacy Notice"),
        p("We may update or change this Privacy Notice from time to time. We will post the changes on our Website and "
          "software, and will indicate the effective date. Your continued use of services after the changes are "
          "effective constitutes your acceptance of the Privacy Notice."),

        heading("XII", "Contact Us"),
        p("If you have any questions about this Privacy Notice, or feel that we are not abiding by it, contact us "
          "at:"),
    ] + contact_block()
    return s


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    terms = build("TermsofUse.pdf", "Terms of Use", terms_of_use())
    privacy = build("PrivacyNotice.pdf", "Privacy Notice", privacy_notice())
    shutil.copyfile(privacy, os.path.join(OUT_DIR, "policy.pdf"))
    print(terms)
    print(privacy)
    return 0


if __name__ == "__main__":
    sys.exit(main())
