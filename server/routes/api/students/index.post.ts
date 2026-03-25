import { addressService } from '#server/service/address.service.ts';
import { studentParentService } from '#server/service/student-parent.service.ts';
import { studentService } from '#server/service/student.service.ts';
import { ValidationError } from '#server/utils/errors.ts';
import { requestBody } from '#server/utils/request-body.ts';
import { handleError, successResponse } from '#server/utils/response.ts';
import { createStudentSchema } from '#server/validators/student.validation.ts';
import { defineHandler } from 'nitro';
import z from 'zod';

export default defineHandler(async (event) => {
	try {
		const user = event.context.user;
		const body = await requestBody(event);
		const { data, error, success } = createStudentSchema.safeParse(body);

		if (!success) {
			throw new ValidationError(z.treeifyError(error));
		}

		const [student] = await studentService.create({
			id: user.id,
			birthdate: data.birthdate,
			contactNumber: data.contactNumber,
			email: user.email,
			extName: data.extName,
			firstName: data.firstName,
			lastName: data.lastName,
			middleName: data.middleName,
			sex: data.sex,
			yearLevel: data.yearLevel,
		});

		const address = await addressService.create({
			studentId: student?.id,
			street: data.address.street,
			barangay: data.address.barangay,
			city: data.address.city,
			province: data.address.province,
			zipcode: data.address.zipcode,
		});

		const paresedParents = data.parents.map((parent) => ({
			type: parent.type,
			firstName: parent.firstName,
			lastName: parent.lastName,
			middleName: parent.middleName,
			contactNumber: parent.contactNumber,
			studentId: student?.id ?? '',
		}));

		const parents = await studentParentService.createMany(paresedParents);

		return successResponse({
			student,
			address,
			parents,
		});
	} catch (err) {
		return handleError(event, err);
	}
});
