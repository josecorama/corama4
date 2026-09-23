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

COMPANY = "Corama, Inc."
PRODUCT = "Contract Radar Maximizer"
CONTACT_NAME = "Jose Armando Delgado Lopez"
CONTACT_TITLE = "Executive Director, CORAMA"
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
        Paragraph(COMPANY, CONTACT),
        Paragraph(f"{CONTACT_NAME}, {CONTACT_TITLE}", CONTACT),
        Paragraph(CONTACT_ADDRESS, CONTACT),
        Paragraph(CONTACT_EMAIL, CONTACT),
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
        p(f"These are the Terms of Use (the \u201cTerms\u201d) for {COMPANY} (\u201cCorama\u201d). These Terms apply "
          "when you visit any websites owned and operated by Corama, including our website at corama.ai (the "
          f"\u201cWebsite\u201d), use our artificial intelligence software and the {PRODUCT} platform, interact with us "
          "on or offline, attend our events, or use any and all of our products and services (collectively, our "
          "\u201cServices\u201d)."),
        p("By using our Services, you acknowledge you have read our Privacy Notice, and agree to our Terms of Use."),

        heading("I", "Eligibility Requirements"),
        p("By accepting these Terms through your use of our Services, you certify that you are at least 18 years of age "
          "or are at least 13 years of age and using the Services with the permission and supervision from a parent or "
          "guardian."),

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

        heading("IX", "Termination of Access"),
        p("Corama maintains the right to suspend or disable your access to the Services and any Account you may have "
          "created, or terminate these Terms, at our sole discretion and without prior notice to you if you breach the "
          "Terms, or if Corama otherwise determines such action is warranted."),
        p("Corama reserves the right to revoke your access to and use of the Services at any time, with or without "
          "cause."),

        heading("X", "Updates"),
        p("Corama may from time to time in its sole discretion develop and provide updates to the Services, which may "
          "include upgrades, bug fixes, patches, other error corrections, and/or new features (collectively, including "
          "related documentation, \u201cUpdates\u201d). Updates may also modify or delete in their entirety certain "
          "features and functionality. You agree that Corama has no obligation to provide any Updates or to continue to "
          "provide or enable any particular features or functionality. You shall promptly download and install all "
          "Updates and acknowledge and agree that the Services or portions thereof may not properly operate should you "
          "fail to do so. You further agree that all Updates will be deemed part of the Services and be subject to these "
          "Terms."),

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
        p("<b>License to Corama.</b> By entering Input into the Corama artificial intelligence software, you grant to "
          "Corama a perpetual, worldwide, non-exclusive, sublicensable no-charge, royalty-free, irrevocable copyright "
          "license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and "
          "distribute the Input. This license survives termination of these Terms by any party, for any reason."),
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
          "maintain, develop, and improve our Services, comply with applicable law, train our artificial intelligence "
          "software, enforce our terms and policies, and keep our Services safe."),
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
          "including government procurement portals such as SAM.gov. Corama has no control over such sites and resources "
          "and Corama is not responsible for and does not endorse such sites and resources."),

        heading("XV", "Communications"),
        p("As part of your use of our Services, you consent to receive electronic notifications from Corama. You may "
          "opt-out of receiving certain notifications from Corama by completing the opt-out process provided in each "
          "email message. By opting-out, you understand that we may not be able to communicate certain information to "
          "you. Please note we may still contact you regarding certain transactional announcements or notifications even "
          "if you have opted-out from other messages."),

        heading("XVI", "Third-Party Advertising &amp; Marketing"),
        p("Corama may employ third-party advertising and marketing to deliver ads, information, and other promotions to "
          "you, both through our Services and other mechanisms. By agreeing to our Terms, you agree to receive such "
          "advertising and marketing from Corama and our partners. If you do not wish to receive such advertising, you "
          "may opt out with the instructions provided within the communication. Corama may compile and release "
          "information regarding you and your use of our Services on an anonymous basis as part of a customer profile or "
          "similar report or analysis. It is your responsibility to take reasonable precautions in all actions and "
          "interactions with any third party you interact with through our Services."),

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
        p("<b>Governing Law.</b> Terms will be governed by the laws of Delaware without regard to conflict of law "
          "provisions. With respect to any disputes not subject to the dispute resolution procedures set forth above, "
          "you and Corama agree to submit to the personal and exclusive jurisdiction of the local courts located in Kent "
          "County, Delaware and the federal courts located in the United States District Court for the District of "
          "Delaware. Corama may assign or transfer these Terms, in whole or in part, without restriction."),
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
        p(f"{COMPANY} (\u201cCorama\u201d) understands the importance of your privacy. This Privacy Notice applies "
          "when you visit any websites owned and operated by Corama, including our website at corama.ai (the "
          f"\u201cWebsite\u201d), use our artificial intelligence software and the {PRODUCT} platform, interact with us "
          "on or offline, attend our events, or use any and all of our products and services (collectively, our "
          "\u201cServices\u201d). Our Privacy Notice describes our collection of information during your interactions "
          "with our Services, and the rights and choices you have regarding your information."),
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
        bullets(["Full Name", "Email", "Company", "Business identifiers such as UEI, CAGE code, and NAICS codes"]),
        p("<b>Communications Information.</b> We collect information within messages we exchange when you communicate "
          "with us. This includes:"),
        bullets(["Information in support requests", "Questions and feedback", "Survey responses",
                 "Other information you provide"]),
        p("<b>Browsing and Usage Information.</b> We use cookies and other embedded tracking technology like web "
          "beacons which automatically collect users\u2019 browsing information when they use our Services. "
          "Additionally, other parties like our analytics and advertising partners place code with cookies or web "
          "beacons embedded in them. These are called third-party cookies. Some third-party cookies are used to track a "
          "particular user\u2019s activity across the Internet. The information collected includes:"),
        bullets(["IP address", "Browser type", "Browser settings", "Device ID", "Device information",
                 "Operating system", "Cookie ID", "Browsing history"]),
        p("<b>Documents and Business Information You Upload.</b> When you use our artificial intelligence software, we "
          "collect the documents and information you upload or enter, such as capability statements, company "
          "descriptions, past performance information, and proposal drafts."),
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
            "Data to our service providers who help us deliver our products and services to you and for the purposes "
            "described in this Privacy Notice, including cloud hosting, database, authentication, email delivery, and "
            "artificial intelligence model providers. These service providers are required by contract or law to only "
            "use or disclose the information as necessary to perform services on our behalf or as otherwise required by "
            "law.",
            "<b>In the CORAMA Directory.</b> If you choose to publish a profile in the CORAMA Directory, the business "
            "information you include in that profile will be visible to other users and visitors of the Services.",
            "<b>In the Event of a Merger, Acquisition, Change in Ownership, or Reorganization.</b> Information and "
            "Personal Data we have collected may be disclosed to a third party in the event of a merger, transfer of "
            "ownership or assets, bankruptcy, or other corporate reorganization.",
            "<b>For Data Analytics.</b> We share your information and Personal Data with analytics service providers "
            "such as Google. Google may combine your browsing information, including information from your use of our "
            "Website, to generate interest-based advertisements. Google\u2019s data collection is governed by their own "
            "Privacy Notice, found at: https://policies.google.com/privacy. You can opt out of Google Analytics tracking "
            "here: https://tools.google.com/dlpage/gaoptout.",
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
        p("We use cookies to help you personalize your online experience. A cookie is a text file that is placed on "
          "your hard disk by a web page server. Cookies cannot be used to run programs or deliver viruses to your "
          "computer. Cookies are uniquely assigned to you and can only be read by a web server in the domain that issued "
          "the cookie to you."),
        p("You have the ability to accept or decline cookies through your web browser. Most web browsers automatically "
          "accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. If you "
          "choose to decline cookies, you may not be able to fully experience the interactive features of the Corama "
          "Services."),

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
            "similarly significant effects.",
            "<b>Right to Portability.</b> You have the right to ask Corama to provide you with your Personal Data in a "
            "machine-readable format.",
            "<b>Right to Limit the Use of or Consent to the Processing of Sensitive Data.</b> We will ask your consent "
            "before we process your sensitive Personal Data or allow you to limit our use of sensitive data as required "
            "by law.",
        ]),
        p("The exact scope of these rights may vary. To exercise any of these rights please contact us at the "
          "information provided below."),
        p("To appeal a decision regarding a consumer rights request, follow the instructions provided in our "
          "communication denying your request."),

        heading("VI", "Exercising Your Privacy Options"),
        p(f"To exercise any of the above options, you may contact us at: {CONTACT_EMAIL}."),
        p("Please include your email address, full name, and specific information about your request(s). If you would "
          "like to update or correct your email address, work address, or other Personal Data with us, please include "
          "specific details about the information you wish to have updated or corrected."),
        p("<b>Messaging and Newsletter Communications.</b> You may control how you receive certain types of "
          "communications by unsubscribing within the body of the communication. Note that some messages are required, "
          "service-related messages such as account confirmation messages, legal notices, or updates."),
        p("<b>Do Not Track Signals.</b> CalOPPA requires us to let you know how we respond to web browser Do Not Track "
          "(\u201cDNT\u201d) signals. DNT is a privacy preference you can set in your web browser to indicate that you "
          "do not want certain information about your webpage visits collected across websites when you have not "
          "interacted with that service on the page. Because there currently isn\u2019t an industry or legal standard "
          "recognizing or honoring DNT signals, we don\u2019t respond to them at this time."),

        heading("VII", "Third Party Websites"),
        p("This Privacy Notice applies only to our Services. Our Services may contain links to other websites, "
          "including government procurement portals such as SAM.gov. We have no control over the privacy practices or "
          "the content of any of our business partners, advertisers, sponsors, or other third parties we link to from "
          "our Services. Corama does not endorse, approve, or certify these other websites, and we do not guarantee the "
          "accuracy, completeness, efficacy, or timeliness of the information contained on those websites. You should "
          "check the applicable privacy notice of the website sponsor when linking to other websites."),

        heading("VIII", "Information Retention"),
        p("Corama uses several criteria to determine how long we should keep categories of Personal Data. We will "
          "retain your Personal Data for the time period reasonably necessary to achieve the business purposes outlined "
          "in this Privacy Notice to the extent permitted by applicable law. Please understand that residual copies of "
          "the Personal Data can be stored in locations or formats that make complete erasure extremely difficult. The "
          "best way to ensure you control your information is to give us only the Personal Data that you are completely "
          "comfortable sharing with us."),

        heading("IX", "Security"),
        p("Corama takes reasonable steps to secure your Personal Data. We maintain physical, electronic, and procedural "
          "safeguards to ensure that Personal Data is stored and processed responsibly. However, no internet "
          "transmission is ever fully secure, and we cannot guarantee that information transmitted via our Website will "
          "remain confidential at all times."),

        heading("X", "Age Restrictions"),
        p("Corama takes children\u2019s privacy seriously. By accepting the Privacy Notice through your use of our "
          "Services, you certify that you are at least 18 years of age or at least 13 years of age and submitting "
          "Personal Data to us with the consent of a parent or guardian. If we find that a minor has submitted any "
          "information to us without parental consent, we will delete it immediately upon discovery."),

        heading("XI", "Changes to Privacy Notice"),
        p("We may update or change this Privacy Notice from time to time. We will post the changes on our Website and "
          "software, and will indicate the effective date. Your continued use of services after the changes are "
          "effective constitutes your acceptance of the Privacy Notice."),

        heading("XII", "Contact Us"),
        p("If you have any questions about this Privacy Notice, contact us at:"),
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
