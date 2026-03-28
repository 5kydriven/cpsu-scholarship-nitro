import { supabaseAdmin } from '#server/lib/supabase.ts';
import { personnelService } from '#server/service/personnel.service.ts';
import { BadRequestError, ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createPersonnelSchema } from '#server/validators/personnel.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const {
			data: parsed,
			success,
			error: parsedErr,
		} = createPersonnelSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(parsedErr));
		}

		const { data, error } = await supabaseAdmin.auth.signUp({
			email: parsed.email,
			password: parsed.password,
			options: {
				data: {
					role: parsed.role,
				},
			},
		});

		if (error) {
			throw new BadRequestError(error.message);
		}

		const result = await personnelService.create({
			id: data.user?.id ?? '',
			firstName: parsed.firstName,
			lastName: parsed.lastName,
			middleName: parsed.middleName,
			extName: parsed.extName,
			sex: parsed.sex,
			birthdate: parsed.birthdate,
			contactNumber: parsed.contactNumber,
			department: parsed.department,
			position: parsed.position,
			email: parsed.email,
		});

		return successResponse(result);
	} catch (err) {
		return handleError(event, err);
	}
});
