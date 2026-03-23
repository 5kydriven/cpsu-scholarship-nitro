import { addressService } from '#server/service/address.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createAddressSchema } from '#server/validators/address.validator.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const body = await requestBody(event);
		const { data, success, error } = createAddressSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const response = addressService.create({
			studentId: data.studentId,
			personnelId: data.personnelId,
			street: data.street,
			barangay: data.barangay,
			city: data.city,
			province: data.province,
			zipcode: data.zipcode,
		});

		return successResponse(response);
	} catch (err) {
		return handleError(event, err);
	}
});
