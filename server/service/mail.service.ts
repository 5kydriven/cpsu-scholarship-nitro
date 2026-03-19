import nodemailer from 'nodemailer';
import { env } from '../utils/env';

// ─────────────────────────────────────────────
// mail.service.ts  (Phase 2 — extended)
//
// All methods are async and should be called
// fire-and-forget from services:
//
//   mailService.sendApplicationApproved(...).catch(console.error);
//
// Never await mail in a request handler — it must
// not block or fail the API response.
// ─────────────────────────────────────────────

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_PORT === 465,
	auth: {
		user: env.SMTP_USER,
		pass: env.SMTP_PASS,
	},
});

export const mailService = {
	async send(to: string, subject: string, html: string) {
		return transporter.sendMail({
			from: env.MAIL_FROM,
			to,
			subject,
			html,
		});
	},

	// ── Generic ───────────────────────────────

	async sendWelcome(to: string, name: string) {
		return this.send(
			to,
			'Welcome to the CPSU Scholarship System',
			`
			<p>Hi ${name},</p>
			<p>Your student account has been created. You can now log in and submit your scholarship application.</p>
			<p>Central Philippine State University — Scholarship Management System</p>
			`,
		);
	},

	// ── Phase 2 — Application decisions ──────

	async sendApplicationApproved(
		to: string,
		name: string,
		details: {
			awardNo: string;
			appNo: string;
			batch: string;
			programName: string;
		},
	) {
		return this.send(
			to,
			'Your scholarship application has been approved',
			`
			<p>Dear ${name},</p>
			<p>We are pleased to inform you that your scholarship application for <strong>${details.programName}</strong> has been <strong>approved</strong>.</p>
			<table style="border-collapse:collapse;margin:16px 0;">
				<tr><td style="padding:4px 12px 4px 0;color:#555;">Award No.</td><td style="padding:4px 0;"><strong>${details.awardNo}</strong></td></tr>
				<tr><td style="padding:4px 12px 4px 0;color:#555;">Application No.</td><td style="padding:4px 0;"><strong>${details.appNo}</strong></td></tr>
				<tr><td style="padding:4px 12px 4px 0;color:#555;">Batch</td><td style="padding:4px 0;"><strong>${details.batch}</strong></td></tr>
			</table>
			<p>Please keep this information for your records.</p>
			<p>Central Philippine State University — Scholarship Management System</p>
			`,
		);
	},

	async sendApplicationRejected(
		to: string,
		name: string,
		details: {
			programName: string;
			reason?: string;
		},
	) {
		return this.send(
			to,
			'Update on your scholarship application',
			`
			<p>Dear ${name},</p>
			<p>We regret to inform you that your scholarship application for <strong>${
				details.programName
			}</strong> was not approved at this time.</p>
			${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}
			<p>If you have questions, please contact the scholarship office.</p>
			<p>Central Philippine State University — Scholarship Management System</p>
			`,
		);
	},

	// ── Scheduled task hook ───────────────────
	async processQueue() {
		console.log('[mail] processQueue — no pending items');
	},
};
