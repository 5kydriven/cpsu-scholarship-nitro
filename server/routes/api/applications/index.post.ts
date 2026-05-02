import { addressService } from '#server/services/address.service.ts';
import { applicationStatusHistoryService } from '#server/services/application-status-history.service.ts';
import { applicationService } from '#server/services/application.service.ts';
import { documentService } from '#server/services/document.service.ts';
import { nominationService } from '#server/services/nomination.service.ts';
import { scholarService } from '#server/services/scholar.service.ts';
import { scholarshipOfferingService } from '#server/services/scholarship-offering.service.ts';
import { studentParentService } from '#server/services/student-parent.service.ts';
import { studentService } from '#server/services/student.service.ts';
import { db } from '#server/db/index.ts';
import {
	BadRequestError,
	ForbiddenError,
	UnauthorizedError,
	ValidationError,
} from '#server/utils/errors.ts';
import { parseFlatMultipartForm } from '#server/utils/multipart-form.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { submitApplicationSchema } from '#server/validators/application.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

function assertMultipartForm(event: any) {
	const contentType = event.req.headers.get('content-type') ?? '';

	if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
		throw new BadRequestError('Application submission requires multipart/form-data');
	}
}

export default defineHandler(async (event) => {
	try {
		if (event.context.role !== 'student') {
			throw new UnauthorizedError('Student access required');
		}

		assertMultipartForm(event);

		const body = await requestBody(event);
		const payload = parseFlatMultipartForm(body);
		const { data, error, success } = submitApplicationSchema.safeParse(payload);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const studentUuid = event.context.user.id;
		const offering = await scholarshipOfferingService.getById(data.offeringId);

		if (offering.status !== 'open' || !offering.program?.isActive) {
			throw new BadRequestError('Scholarship offering is not open');
		}

		await applicationService.assertNotSubmitted(studentUuid, data.offeringId);

		const shouldApproveImmediately =
			offering.program.intakeType === 'staff_nomination';
		const nomination = shouldApproveImmediately
			? await nominationService.findPendingByStudentAndOffering(
					studentUuid,
					data.offeringId,
				)
			: null;

		if (shouldApproveImmediately && !nomination) {
			throw new ForbiddenError(
				'You must be nominated before submitting this scholarship form',
			);
		}

		const applicationId = crypto.randomUUID();
		const now = new Date().toISOString();
		const uploaded = await documentService.uploadApplicationDocuments(
			applicationId,
			data.documents,
		);

		try {
			const result = await db.transaction(async (tx) => {
				const student = await studentService.upsertProfile(
					studentUuid,
					event.context.user.email,
					{
						...data.profile,
						studentId: data.studentId,
					},
					tx,
				);
				const address = await addressService.upsertForStudent(
					studentUuid,
					data.profile.address,
					tx,
				);
				const parents = await studentParentService.replaceForStudent(
					studentUuid,
					data.profile.parents,
					tx,
				);
				const application = await applicationService.create(
					{
						id: applicationId,
						studentId: studentUuid,
						offeringId: data.offeringId,
						status: shouldApproveImmediately ? 'approved' : 'pending',
						formType: offering.program.code ?? offering.program.name,
						extraAnswers: data.extraAnswers,
						submittedAt: now,
						approvedAt: shouldApproveImmediately ? now : null,
					},
					tx,
				);
				const documents = await documentService.createMany(uploaded.rows, tx);
				const statusHistory = await applicationStatusHistoryService.create(
					{
						applicationId,
						toStatus: application?.status ?? 'pending',
						reason: shouldApproveImmediately
							? 'Nominated student completed form'
							: 'Student submitted application',
					},
					tx,
				);
				const scholar = shouldApproveImmediately
					? await scholarService.createForApplication(application, offering, tx)
					: null;

				if (nomination) {
					await nominationService.complete(nomination.id, applicationId, tx);
				}

				return {
					student,
					address,
					parents,
					application,
					documents,
					statusHistory,
					scholar,
				};
			});

			return successResponse(result);
		} catch (err) {
			await documentService.deleteUploaded(uploaded.uploadedPaths);
			throw err;
		}
	} catch (err) {
		return handleError(event, err);
	}
});
