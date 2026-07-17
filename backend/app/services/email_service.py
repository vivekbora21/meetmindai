import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List
from sqlalchemy.orm import Session

from app.config.email import email_settings
from app.models.models import Meeting, ActionItem, Decision, Risk, User, Question

logger = logging.getLogger("meeting.email")


class EmailService:
    @staticmethod
    def get_initials(name: str) -> str:
        if not name:
            return "U"
        parts = name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return name[0].upper() if name else "U"

    @staticmethod
    def generate_mom_html(
        meeting: Meeting,
        action_items: List[ActionItem],
        decisions: List[Decision],
        risks: List[Risk],
        questions: List[Question],
    ) -> str:
        """
        Generates a premium, highly polished HTML Minutes of Meeting (MOM) template
        matching enterprise SaaS designs (Notion, Linear, Zoom AI Companion).
        """
        date_str = (
            meeting.meeting_date.strftime("%B %d, %Y")
            if meeting.meeting_date
            else "N/A"
        )
        time_str = (
            meeting.meeting_date.strftime("%I:%M %p") if meeting.meeting_date else "N/A"
        )
        duration_min = meeting.duration_seconds // 60 if meeting.duration_seconds else 0

        # Attendees & Participants list
        attendees_list = []
        if meeting.attendees:
            try:
                for att in meeting.attendees:
                    if isinstance(att, str):
                        attendees_list.append(att)
                    elif isinstance(att, dict):
                        name = att.get("name") or att.get("email") or att.get("address")
                        if name:
                            attendees_list.append(name)
            except Exception:
                pass
        attendees_pills = ""
        for att in attendees_list[:5]:  # Cap at 5 display list
            attendees_pills += f'<span style="display: inline-block; background-color: #F1F5F9; color: #475569; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 4px; margin-right: 4px; margin-bottom: 4px;">{att}</span>'
        if len(attendees_list) > 5:
            attendees_pills += f'<span style="display: inline-block; background-color: #E2E8F0; color: #64748B; font-size: 12px; font-weight: 500; padding: 3px 8px; border-radius: 4px;">+{len(attendees_list) - 5} more</span>'
        if not attendees_pills:
            attendees_pills = '<span style="color: #94A3B8; font-style: italic;">No attendees listed</span>'

        # Executive Summary Highlight Card
        summary_html = ""
        if meeting.executive_summary:
            summary_html = f"""
            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                    <td style="background-color: #F0F9FF; border-left: 4px solid #2563EB; padding: 20px; border-radius: 0 8px 8px 0;">
                        <h2 style="margin: 0 0 8px 0; color: #1E3A8A; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Executive Summary</h2>
                        <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">{meeting.executive_summary}</p>
                    </td>
                </tr>
            </table>
            """

        # Quick Highlights Section
        highlights_html = ""
        if meeting.one_minute_read:
            items_html = ""
            for line in meeting.one_minute_read.split("\n"):
                line_str = line.strip()
                if not line_str:
                    continue
                if line_str.startswith("-") or line_str.startswith("*"):
                    line_str = line_str[1:].strip()
                items_html += f"""
                <tr style="border-bottom: 1px solid #F1F5F9;">
                    <td style="padding: 10px 0; vertical-align: top; width: 24px;">
                        <span style="display: inline-block; width: 16px; height: 16px; background-color: #E0F2FE; color: #0284C7; text-align: center; border-radius: 50%; font-size: 11px; font-weight: bold; line-height: 16px;">✓</span>
                    </td>
                    <td style="padding: 10px 0; color: #334155; font-size: 13.5px; line-height: 1.5;">{line_str}</td>
                </tr>
                """
            highlights_html = f"""
            <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; color: #0F172A; font-size: 15px; font-weight: 700;">Key Takeaways & Highlights</h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    {items_html}
                </table>
            </div>
            """

        # Key Themes / Topics Discussed
        themes_html = ""
        if meeting.key_themes:
            pills = ""
            try:
                for theme in meeting.key_themes:
                    theme_str = theme if isinstance(theme, str) else str(theme)
                    pills += f'<span style="display: inline-block; background-color: #F8FAFC; border: 1px solid #E2E8F0; color: #475569; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px; margin-right: 6px; margin-bottom: 6px;">#{theme_str}</span>'
            except Exception:
                pass
            if pills:
                themes_html = f"""
                <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 10px 0; color: #0F172A; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Topics Discussed</h3>
                    <div style="line-height: 1.8;">{pills}</div>
                </div>
                """

        # Key Decisions
        decisions_html = ""
        if decisions:
            items = ""
            for dec in decisions:
                rationale_str = (
                    f'<div style="font-size: 12.5px; color: #64748B; margin-top: 4px; line-height: 1.4;"><strong>Rationale:</strong> {dec.rationale}</div>'
                    if dec.rationale
                    else ""
                )
                items += f"""
                <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
                    <div style="display: table; width: 100%;">
                        <div style="display: table-cell; vertical-align: top; width: 24px;">
                            <span style="display: inline-block; width: 18px; height: 18px; background-color: #EEF2FF; color: #4F46E5; text-align: center; border-radius: 4px; font-size: 11px; font-weight: bold; line-height: 18px;">D</span>
                        </div>
                        <div style="display: table-cell; vertical-align: top; padding-left: 8px;">
                            <div style="font-size: 14px; font-weight: 600; color: #0F172A; line-height: 1.4;">{dec.decision_text}</div>
                            {rationale_str}
                        </div>
                    </div>
                </div>
                """
            decisions_html = f"""
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #0F172A; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Key Decisions</h3>
                {items}
            </div>
            """

        # Action Items Table
        action_items_html = ""
        if action_items:
            rows = ""
            for item in action_items:
                priority = (item.priority or "Medium").upper()
                badge_style = "background-color: #FEF3C7; color: #D97706;"  # Medium
                if priority == "HIGH" or priority == "CRITICAL":
                    badge_style = "background-color: #FEE2E2; color: #DC2626;"
                elif priority == "LOW":
                    badge_style = "background-color: #DCFCE7; color: #16A34A;"

                status = (item.status or "Pending").upper()
                status_style = "background-color: #F1F5F9; color: #475569;"
                if status == "COMPLETED" or status == "DONE":
                    status_style = "background-color: #DCFCE7; color: #16A34A;"
                elif status == "IN_PROGRESS" or status == "RUNNING":
                    status_style = "background-color: #DBEAFE; color: #2563EB;"

                assignee_name = "Unassigned"
                avatar_html = ""
                if item.assigned_user:
                    assignee_name = item.assigned_user.name
                    initials = EmailService.get_initials(assignee_name)
                    avatar_html = f"""
                    <span style="display: inline-block; width: 22px; height: 22px; background-color: #6366F1; color: #FFFFFF; text-align: center; border-radius: 50%; font-size: 10px; font-weight: bold; line-height: 22px; margin-right: 6px; vertical-align: middle;">
                        {initials}
                    </span>
                    """
                else:
                    avatar_html = """
                    <span style="display: inline-block; width: 22px; height: 22px; background-color: #E2E8F0; color: #64748B; text-align: center; border-radius: 50%; font-size: 10px; font-weight: bold; line-height: 22px; margin-right: 6px; vertical-align: middle;">
                        ?
                    </span>
                    """

                rows += f"""
                <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 12px; font-size: 13.5px; color: #0F172A; line-height: 1.4;">{item.description}</td>
                    <td style="padding: 12px; font-size: 13px; color: #334155; white-space: nowrap;">
                        {avatar_html}<span style="vertical-align: middle;">{assignee_name}</span>
                    </td>
                    <td style="padding: 12px; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; {badge_style}">
                            {priority}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; {status_style}">
                            {status}
                        </span>
                    </td>
                </tr>
                """

            action_items_html = f"""
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #0F172A; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Action Items</h3>
                <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background-color: #FFFFFF;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Task</th>
                                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Owner</th>
                                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Priority</th>
                                <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows}
                        </tbody>
                    </table>
                </div>
            </div>
            """

        # Risks & Blockers Section
        risks_html = ""
        blockers_html = ""
        if risks:
            risk_cards = ""
            blocker_cards = ""
            for r in risks:
                sev = (r.severity or "Medium").upper()
                mitigation_str = (
                    f'<div style="font-size: 12.5px; color: #64748B; margin-top: 4px;"><strong>Mitigation:</strong> {r.mitigation}</div>'
                    if r.mitigation
                    else ""
                )

                if sev in ("CRITICAL", "HIGH"):
                    blocker_cards += f"""
                    <div style="background-color: #FFF5F5; border: 1px solid #FEE2E2; border-left: 4px solid #DC2626; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
                        <span style="float: right; display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: #FEE2E2; color: #DC2626; text-transform: uppercase;">{sev}</span>
                        <div style="font-weight: 600; color: #7F1D1D; font-size: 13.5px; padding-right: 50px; line-height: 1.4;">{r.risk_text}</div>
                        {mitigation_str}
                    </div>
                    """
                else:
                    risk_cards += f"""
                    <div style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-left: 4px solid #D97706; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
                        <span style="float: right; display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: #FEF3C7; color: #D97706; text-transform: uppercase;">{sev}</span>
                        <div style="font-weight: 600; color: #92400E; font-size: 13.5px; padding-right: 50px; line-height: 1.4;">{r.risk_text}</div>
                        {mitigation_str}
                    </div>
                    """

            if blocker_cards:
                blockers_html = f"""
                <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #991B1B; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Blockers & High Risks</h3>
                    {blocker_cards}
                </div>
                """
            if risk_cards:
                risks_html = f"""
                <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #B45309; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Potential Risks</h3>
                    {risk_cards}
                </div>
                """

        # Open Questions Section
        questions_html = ""
        if questions:
            q_items = ""
            for q in questions:
                q_items += f"""
                <div style="background-color: #FAF5FF; border: 1px solid #F3E8FF; border-left: 4px solid #A855F7; border-radius: 8px; padding: 14px; margin-bottom: 10px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; width: 22px;">
                                <span style="display: inline-block; width: 16px; height: 16px; background-color: #F3E8FF; color: #7E22CE; text-align: center; border-radius: 4px; font-size: 11px; font-weight: bold; line-height: 16px;">?</span>
                            </td>
                            <td style="vertical-align: top; padding-left: 6px; font-size: 13.5px; font-weight: 600; color: #581C87; line-height: 1.4;">
                                {q.question_text}
                            </td>
                        </tr>
                    </table>
                </div>
                """
            questions_html = f"""
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #6B21A8; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Open Questions</h3>
                {q_items}
            </div>
            """

        # Next Steps Numbers roadmap
        next_steps_html = ""
        if action_items:
            steps_items = ""
            # Take up to 3 major action items as roadmap milestones
            for idx, item in enumerate(action_items[:3]):
                steps_items += f"""
                <div style="margin-bottom: 12px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: middle; width: 28px;">
                                <span style="display: inline-block; width: 20px; height: 20px; background-color: #2563EB; color: #FFFFFF; text-align: center; border-radius: 50%; font-size: 11px; font-weight: bold; line-height: 20px;">{idx + 1}</span>
                            </td>
                            <td style="vertical-align: middle; font-size: 13.5px; font-weight: 500; color: #334155;">
                                {item.description}
                            </td>
                        </tr>
                    </table>
                </div>
                """
            next_steps_html = f"""
            <div style="margin-bottom: 24px; padding-top: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #0F172A; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Roadmap / Next Steps</h3>
                {steps_items}
            </div>
            """

        # Compile final layout
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MOM: {meeting.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F8FAFC; padding: 24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 640px; width: 100%; border-collapse: collapse; margin: 16px auto; padding: 0 16px;">
                    <!-- Header Section -->
                    <tr>
                        <td style="padding: 16px 0 12px 0;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <span style="font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em;">MeetingMind<span style="color: #2563EB;">AI</span></span>
                                    </td>
                                    <td style="text-align: right; vertical-align: middle;">
                                        <span style="display: inline-block; background-color: #EEF2FF; border: 1px solid #E0E7FF; color: #4F46E5; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em; margin-right: 6px;">AI Generated</span>
                                        <span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #E2E8F0; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em;">{meeting.platform or "Upload"}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Separator -->
                    <tr>
                        <td style="border-top: 1px solid #E2E8F0; padding-bottom: 20px;"></td>
                    </tr>

                    <!-- Metadata Info Card -->
                    <tr>
                        <td style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 24px; display: block;">
                            <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.3; letter-spacing: -0.01em;">{meeting.title}</h1>
                            
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                                        <div style="font-size: 12px; color: #64748B; margin-bottom: 2px; text-transform: uppercase; font-weight: 600;">Date & Time</div>
                                        <div style="font-size: 13.5px; font-weight: 600; color: #334155;">{date_str} at {time_str}</div>
                                        
                                        <div style="font-size: 12px; color: #64748B; margin-top: 12px; margin-bottom: 2px; text-transform: uppercase; font-weight: 600;">Duration</div>
                                        <div style="font-size: 13.5px; font-weight: 600; color: #334155;">{duration_min} minutes</div>
                                    </td>
                                    <td style="width: 50%; vertical-align: top; padding-left: 12px; border-left: 1px solid #F1F5F9;">
                                        <div style="font-size: 12px; color: #64748B; margin-bottom: 2px; text-transform: uppercase; font-weight: 600;">Organizer</div>
                                        <div style="font-size: 13.5px; font-weight: 600; color: #334155; margin-bottom: 12px;">{meeting.organizer_email or "N/A"}</div>
                                        
                                        <div style="font-size: 12px; color: #64748B; margin-bottom: 4px; text-transform: uppercase; font-weight: 600;">Attendees</div>
                                        <div>{attendees_pills}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Highlights and Content blocks -->
                    <tr>
                        <td style="padding-top: 4px;">
                            {summary_html}
                            {highlights_html}
                            {themes_html}
                            {decisions_html}
                            {action_items_html}
                            {blockers_html}
                            {risks_html}
                            {questions_html}
                            {next_steps_html}
                        </td>
                    </tr>

                    <!-- Footer Section -->
                    <tr>
                        <td style="border-top: 1px solid #E2E8F0; padding: 24px 0; text-align: center;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{meeting.meeting_url or '#'}" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 6px; text-decoration: none; margin-right: 10px;">View Full Transcript</a>
                                        <a href="#" style="display: inline-block; background-color: #FFFFFF; border: 1px solid #D1D5DB; color: #374151; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 6px; text-decoration: none;">Download PDF</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.6;">
                                Generated by <strong>MeetingMind AI</strong> on {date_str}.<br>
                                Meeting ID: <span style="font-family: monospace; font-size: 11px;">{meeting.id}</span>
                            </p>
                            <p style="margin: 12px 0 0 0; font-size: 11px; color: #94A3B8;">
                                &copy; 2026 MeetingMind AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
        return html

    @classmethod
    def send_mom_email(cls, db: Session, meeting_id: str) -> None:
        """
        Gathers meeting data, formats it using the template, fetches the recipients list,
        and attempts to send the MOM report via SMTP. Saves a copy locally for inspection.
        """
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.error(f"[EmailService] Meeting {meeting_id} not found.")
            return

        # Fetch relations
        action_items = (
            db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).all()
        )
        decisions = db.query(Decision).filter(Decision.meeting_id == meeting_id).all()
        risks = db.query(Risk).filter(Risk.meeting_id == meeting_id).all()
        questions = db.query(Question).filter(Question.meeting_id == meeting_id).all()

        # Build list of recipients
        recipients = set()
        if meeting.organizer_email:
            recipients.add(meeting.organizer_email)

        if meeting.attendees:
            try:
                for att in meeting.attendees:
                    if isinstance(att, str) and "@" in att:
                        recipients.add(att)
                    elif isinstance(att, dict):
                        email = att.get("email") or att.get("address")
                        if email and "@" in email:
                            recipients.add(email)
            except Exception:
                pass

        # Fallback to org users if none found
        if not recipients:
            org_users = (
                db.query(User)
                .filter(User.organization_id == meeting.organization_id)
                .all()
            )
            for u in org_users:
                recipients.add(u.email)

        recipients_list = list(recipients)
        if not recipients_list:
            logger.warning(
                f"[EmailService] No recipients found for meeting {meeting_id}. Aborting."
            )
            return

        # Generate HTML MOM content
        html_content = cls.generate_mom_html(
            meeting, action_items, decisions, risks, questions
        )

        # 1. Always save a copy locally in uploads directory for preview and debugging
        previews_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "uploads",
            "mom_previews",
        )
        os.makedirs(previews_dir, exist_ok=True)
        preview_file_path = os.path.join(previews_dir, f"mom_{meeting_id}.html")
        try:
            with open(preview_file_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            logger.info(f"[EmailService] Saved MOM HTML preview to {preview_file_path}")
        except Exception as e:
            logger.error(f"[EmailService] Failed to write preview file: {e}")

        # 2. Check SMTP Settings. If not configured, exit gracefully
        if not email_settings.SMTP_USER or not email_settings.SMTP_PASSWORD:
            logger.warning(
                "[EmailService] SMTP credentials are not configured in environment. MOM Email delivery skipped (HTML saved locally)."
            )
            return

        # 3. Create MIMEMultipart email message
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Minutes of Meeting: {meeting.title}"
            msg["From"] = (
                f"{email_settings.SMTP_FROM_NAME} <{email_settings.SMTP_FROM_EMAIL}>"
            )
            msg["To"] = ", ".join(recipients_list)

            # Plain text fallback
            text_fallback = f"Minutes of Meeting: {meeting.title}\n\n"
            if meeting.executive_summary:
                text_fallback += f"Executive Summary:\n{meeting.executive_summary}\n\n"
            if action_items:
                text_fallback += "Action Items:\n"
                for item in action_items:
                    text_fallback += f"- {item.description} (Assignee: {item.assigned_user.name if item.assigned_user else 'Unassigned'})\n"

            msg.attach(MIMEText(text_fallback, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            # Send via SMTP
            logger.info(
                f"[EmailService] Dispatching MOM email to recipients: {recipients_list}"
            )

            if email_settings.SMTP_SSL:
                server = smtplib.SMTP_SSL(
                    email_settings.SMTP_HOST, email_settings.SMTP_PORT
                )
            else:
                server = smtplib.SMTP(
                    email_settings.SMTP_HOST, email_settings.SMTP_PORT
                )
                if email_settings.SMTP_TLS:
                    server.starttls()

            server.login(email_settings.SMTP_USER, email_settings.SMTP_PASSWORD)
            server.sendmail(
                email_settings.SMTP_FROM_EMAIL, recipients_list, msg.as_string()
            )
            server.quit()
            logger.info("[EmailService] MOM email sent successfully.")

        except Exception as smtp_err:
            logger.error(f"[EmailService] SMTP transmission failed: {smtp_err}")
