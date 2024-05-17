import { init } from '@langtrace-init/init'
import { withLangTraceRootSpan } from '@langtrace-utils/instrumentation'
// Initialize dotenv
import dotenv from 'dotenv'
import OpenAI from 'openai'
dotenv.config()

init({ write_spans_to_console: false })
interface StudentCustomFunction {
  name: string
  description: string
  parameters: {
    required?: string[]
    type: string
    properties: {
      name: { type: string, description: string }
      major: { type: string, description: string }
      school: { type: string, description: string }
      grades: { type: string, description: string }
      club: { type: string, description: string }
    }
  }
}

const studentCustomFunctions: StudentCustomFunction[] = [
  {
    name: 'extract_student_info',
    description: 'Get the student information from the body of the input text',
    parameters: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Name of the person'
        },
        major: {
          type: 'string',
          description: 'Major subject.'
        },
        school: {
          type: 'string',
          description: 'The university name.'
        },
        grades: {
          type: 'integer',
          description: 'GPA of the student.'
        },
        club: {
          type: 'string',
          description: 'School club for extracurricular activities. '
        }
      }
    }
  }
]

export async function functionCalling (): Promise<void> {
  const openai = new OpenAI()
  await withLangTraceRootSpan(async () => {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content:
              // eslint-disable-next-line no-multi-str
              "David Nguyen \
              is a sophomore majoring in computer science at Stanford University. He is Asian American and has a 3.8 GPA. David is known for his programming skills and is an active member of the university's Robotics Club. \
              He hopes to pursue a career in artificial intelligence after graduating."
          }
        ],
        functions: studentCustomFunctions,
        function_call: 'auto',
        stream: false
      })

      console.info(response)
    } catch (error) {
      console.info(error)
    }
  })
}
